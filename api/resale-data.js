/**
 * HDB Resale Data endpoint proxy with error handling and fallback.
 */
export default async function handler(req, res) {
  const limit = Math.min(parseInt(req.query.limit || '200', 10), 1000);
  const town = req.query.town ? req.query.town.toUpperCase() : null;

  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 6000);

    let apiUrl = `https://data.gov.sg/api/action/datastore_search?resource_id=d_8b84c4ee58e3cfc0ece0d773c8ca6abc&limit=${limit}`;
    if (town && town !== 'ALL') {
      const filters = JSON.stringify({ town });
      apiUrl += `&filters=${encodeURIComponent(filters)}`;
    }

    const headers = {
      'Accept': 'application/json',
      'User-Agent': 'SGHDBResaleMapExplorer/1.0'
    };

    if (process.env.LTA_ACCOUNT_KEY && process.env.LTA_ACCOUNT_KEY.trim() !== '') {
      const key = process.env.LTA_ACCOUNT_KEY.trim();
      headers['Authorization'] = key.startsWith('Bearer ') ? key : `Bearer ${key}`;
      headers['AccountKey'] = key;
    }

    const response = await fetch(apiUrl, {
      signal: controller.signal,
      headers
    });
    clearTimeout(timeoutId);

    if (response.ok) {
      const data = await response.json();
      return res.status(200).json({
        source: 'data.gov.sg',
        records: data?.result?.records || [],
        total: data?.result?.total || 0
      });
    } else {
      return res.status(200).json({
        source: 'fallback',
        warning: `Upstream status ${response.status}`,
        records: []
      });
    }
  } catch (err) {
    return res.status(200).json({
      source: 'fallback',
      warning: err.message,
      records: []
    });
  }
}
