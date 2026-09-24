/**
 * OneMap Search API Proxy endpoint for address and postal code geocoding.
 */
export default async function handler(req, res) {
  const query = req.query.query || req.query.q || '';
  if (!query || typeof query !== 'string' || query.trim() === '') {
    return res.status(400).json({ error: 'Missing search query parameter' });
  }

  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 7000);
    const url = `https://www.onemap.gov.sg/api/common/elastic/search?searchVal=${encodeURIComponent(query.trim())}&returnGeom=Y&getAddrDetails=Y&pageNum=1`;
    const response = await fetch(url, {
      signal: controller.signal,
      headers: {
        'Accept': 'application/json',
        'User-Agent': 'SGHDBResaleMapExplorer/1.0'
      }
    });
    clearTimeout(timeoutId);

    if (!response.ok) {
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
