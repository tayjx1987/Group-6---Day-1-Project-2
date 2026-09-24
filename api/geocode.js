/**
 * OneMap Search API Proxy endpoint for address and postal code geocoding.
 * Refers to Vercel application environment variables (ONE_MAP_ACCESS_TOKEN) for authorization.
 */
export default async function handler(req, res) {
  const query = req.query.query || req.query.q || '';
  if (!query || typeof query !== 'string' || query.trim() === '') {
    return res.status(400).json({ error: 'Missing search query parameter' });
  }

  const headers = {
    'Accept': 'application/json',
    'User-Agent': 'SGHDBResaleMapExplorer/1.0'
  };

  // Refer to Vercel app environment variables (ONE_MAP_ACCESS_TOKEN)
  const token = (
    process.env.ONE_MAP_ACCESS_TOKEN ||
    process.env.ONEMAP_ACCESS_TOKEN ||
    process.env.LTA_ACCOUNT_KEY ||
    ''
  ).trim();

  if (token) {
    headers['Authorization'] = token.startsWith('Bearer ') ? token : `Bearer ${token}`;
  }

  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 8000);
    const url = `https://www.onemap.gov.sg/api/common/elastic/search?searchVal=${encodeURIComponent(
      query.trim()
    )}&returnGeom=Y&getAddrDetails=Y&pageNum=1`;

    const response = await fetch(url, {
      signal: controller.signal,
      headers
    });
    clearTimeout(timeoutId);

    if (!response.ok) {
      // Retry without authorization headers if rejected
      const retryResp = await fetch(url, {
        headers: { 'Accept': 'application/json', 'User-Agent': 'SGHDBResaleMapExplorer/1.0' }
      });
      if (retryResp.ok) {
        const retryData = await retryResp.json();
        return res.status(200).json(retryData);
      }

      return res.status(response.status).json({
        error: `Upstream OneMap returned status ${response.status}`,
        results: []
      });
    }

    const data = await response.json();
    return res.status(200).json(data);
  } catch (err) {
    return res.status(502).json({
      error: 'Failed to reach OneMap Search service',
      message: err.message,
      results: []
    });
  }
}
