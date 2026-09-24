/**
 * OneMap Tile API Proxy endpoint.
 * Retrieves map tiles directly from OneMap API, referencing Vercel application environment variables.
 * Adheres strictly to guardrails: never exposes or logs keys.
 */
export default async function handler(req, res) {
  const style = req.query.style || 'Night';
  const z = req.query.z;
  const x = req.query.x;
  const y = req.query.y;

  if (!z || !x || !y) {
    return res.status(400).send('Missing z, x, or y tile coordinates');
  }

  // Validate allowed OneMap styles
  const validStyles = ['Default', 'Night', 'Grey', 'Original'];
  const safeStyle = validStyles.includes(style) ? style : 'Night';

  const onemapTileUrl = `https://www.onemap.gov.sg/maps/tiles/${safeStyle}/${z}/${x}/${y}.png`;

  const headers = {
    'User-Agent': 'SGHDBResaleMapExplorer/1.0',
    'Accept': 'image/png,image/*;q=0.8'
  };

  // Refer to Vercel application environment variables for OneMap authorization
  const token = process.env.LTA_ACCOUNT_KEY ? process.env.LTA_ACCOUNT_KEY.trim() : '';
  if (token) {
    headers['Authorization'] = token.startsWith('Bearer ') ? token : `Bearer ${token}`;
    headers['AccountKey'] = token;
  }

  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 6000);
    const upstream = await fetch(onemapTileUrl, {
      headers,
      signal: controller.signal
    });
    clearTimeout(timeoutId);

    if (upstream.ok) {
      const buffer = await upstream.arrayBuffer();
      // If OneMap returns valid non-empty tile image
      if (buffer.byteLength > 100) {
        res.setHeader('Content-Type', upstream.headers.get('content-type') || 'image/png');
        res.setHeader('Cache-Control', 'public, max-age=86400, s-maxage=86400, stale-while-revalidate=604800');
        return res.status(200).send(Buffer.from(buffer));
      }
    }

    // Graceful fallback when token is unconfigured or during preview
    const fallbackUrl = safeStyle === 'Night'
      ? `https://a.basemaps.cartocdn.com/dark_all/${z}/${x}/${y}.png`
      : `https://a.basemaps.cartocdn.com/rastertiles/voyager/${z}/${x}/${y}.png`;

    const fallbackResp = await fetch(fallbackUrl, {
      headers: {
        'User-Agent': 'SGHDBResaleMapExplorer/1.0',
        'Accept': 'image/png,image/*;q=0.8'
      }
    });

    if (fallbackResp.ok) {
      const fallbackBuf = await fallbackResp.arrayBuffer();
      res.setHeader('Content-Type', 'image/png');
      res.setHeader('Cache-Control', 'public, max-age=86400');
      return res.status(200).send(Buffer.from(fallbackBuf));
    }

    return res.status(upstream ? upstream.status : 502).send('Tile not available');
  } catch (err) {
    return res.status(502).send('Failed to retrieve map tile from OneMap API');
  }
}
