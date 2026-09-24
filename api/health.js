/**
 * Health check endpoint for service status verification.
 * Adheres strictly to guardrails: never prints or logs API keys.
 */
export default async function handler(req, res) {
  // Check if environment key is present without exposing its value
  const keyConfigured = Boolean(
    process.env.LTA_ACCOUNT_KEY && process.env.LTA_ACCOUNT_KEY.trim().length > 0
  );

  let dataGovStatus = null;
  let dataGovOk = false;
  let oneMapStatus = null;
  let oneMapOk = false;

  // Test Data.gov.sg endpoint with short timeout
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 6000);
    const dataGovResp = await fetch(
      'https://data.gov.sg/api/action/datastore_search?resource_id=d_8b84c4ee58e3cfc0ece0d773c8ca6abc&limit=1',
      { signal: controller.signal }
    );
    clearTimeout(timeoutId);
    dataGovStatus = dataGovResp.status;
    dataGovOk = dataGovResp.ok;
  } catch (err) {
    dataGovStatus = err.name === 'AbortError' ? 408 : 502;
    dataGovOk = false;
  }

  // Test OneMap Search API endpoint with short timeout
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 6000);
    const oneMapResp = await fetch(
      'https://www.onemap.gov.sg/api/common/elastic/search?searchVal=Ang+Mo+Kio&returnGeom=Y&getAddrDetails=Y&pageNum=1',
      { signal: controller.signal }
    );
    clearTimeout(timeoutId);
    oneMapStatus = oneMapResp.status;
    oneMapOk = oneMapResp.ok;
  } catch (err) {
    oneMapStatus = err.name === 'AbortError' ? 408 : 502;
    oneMapOk = false;
  }

  res.setHeader('Content-Type', 'application/json');
  return res.status(200).json({
    status: 'ok',
    keyConfigured,
    upstream: {
      dataGov: {
        statusCode: dataGovStatus,
        answered: dataGovStatus !== null,
        ok: dataGovOk
      },
      oneMap: {
        statusCode: oneMapStatus,
        answered: oneMapStatus !== null,
        ok: oneMapOk
      }
    },
    timestamp: new Date().toISOString()
  });
}
