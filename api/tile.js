/**
 * OneMap Tile API Proxy endpoint.
 * Retrieves map tiles directly from OneMap API, referencing Vercel application environment variables (ONE_MAP_ACCESS_TOKEN).
 * Adheres strictly to guardrails: never exposes or logs keys.
 */
export default async function handler(req, res) {
  let style = req.query.style || 'Night';
  let z = req.query.z;
  let x = req.query.x;
  let y = req.query.y;

  // Support path routing e.g. /api/tiles/:style/:z/:x/:y.png
  if (!z || !x || !y) {
    const urlMatch = req.url && req.url.match(/\/(?:api\/)?tiles?\/([a-zA-Z]+)\/(\d+)\/(\d+)\/(\d+)/i);
    if (urlMatch) {
      style = urlMatch[1];
      z = urlMatch[2];
      x = urlMatch[3];
      y = urlMatch[4];
    }
  }

  // Handle slug array from Vercel dynamic catch-all route if present
  if ((!z || !x || !y) && req.query.slug && Array.isArray(req.query.slug)) {
    const [slugStyle, slugZ, slugX, slugY] = req.query.slug;
    if (slugStyle) style = slugStyle;
    if (slugZ) z = slugZ;
    if (slugX) x = slugX;
    if (slugY) y = slugY;
  }

  if (!z || !x || !y) {
    return res.status(400).send('Missing z, x, or y tile coordinates');
  }

  // Sanitize coordinates (strip .png if attached to y)
  const cleanY = String(y).replace(/\.png$/i, '');
  const cleanZ = String(z);
  const cleanX = String(x);

  // Validate allowed OneMap styles (Default, Night, Grey, Original)
  const validStyles = ['Default', 'Night', 'Grey', 'Original'];
  let safeStyle = 'Night';
  if (style) {
    const formatted = style.charAt(0).toUpperCase() + style.slice(1).toLowerCase();
    if (validStyles.includes(formatted)) {
      safeStyle = formatted;
    } else if (style.toLowerCase() === 'day') {
      safeStyle = 'Default';
    }
  }

  const onemapTileUrl = `https://www.onemap.gov.sg/maps/tiles/${safeStyle}/${cleanZ}/${cleanX}/${cleanY}.png`;

  const headers = {
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
    'Accept': 'image/avif,image/webp,image/apng,image/svg+xml,image/*,*/*;q=0.8'
  };

  // Refer to Vercel application environment variables for OneMap authorization
  // Prioritize ONE_MAP_ACCESS_TOKEN configured in Vercel
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
    const timeoutId = setTimeout(() => controller.abort(), 10000);
    const upstream = await fetch(onemapTileUrl, {
      headers,
      signal: controller.signal
    });
    clearTimeout(timeoutId);

    if (upstream.ok) {
      const buffer = await upstream.arrayBuffer();
      // If OneMap returns valid non-empty tile image
      if (buffer.byteLength > 0) {
        res.setHeader('Content-Type', upstream.headers.get('content-type') || 'image/png');
        res.setHeader('Cache-Control', 'public, max-age=86400, s-maxage=86400, stale-while-revalidate=604800');
        return res.status(200).send(Buffer.from(buffer));
      } else {
        // Tile outside Singapore boundary: return transparent 1x1 png so map displays cleanly
        const transparentPng = Buffer.from(
          'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII=',
          'base64'
        );
        res.setHeader('Content-Type', 'image/png');
        res.setHeader('Cache-Control', 'public, max-age=86400');
        return res.status(200).send(transparentPng);
      }
    }

    // Fallback to high quality Carto basemap if OneMap upstream is unavailable
    const fallbackUrl = safeStyle === 'Night'
      ? `https://a.basemaps.cartocdn.com/dark_all/${cleanZ}/${cleanX}/${cleanY}.png`
      : `https://a.basemaps.cartocdn.com/rastertiles/voyager/${cleanZ}/${cleanX}/${cleanY}.png`;

    const fallbackResp = await fetch(fallbackUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)',
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
    try {
      const fallbackUrl = safeStyle === 'Night'
        ? `https://a.basemaps.cartocdn.com/dark_all/${cleanZ}/${cleanX}/${cleanY}.png`
        : `https://a.basemaps.cartocdn.com/rastertiles/voyager/${cleanZ}/${cleanX}/${cleanY}.png`;
      const fallbackResp = await fetch(fallbackUrl, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)',
          'Accept': 'image/png,image/*;q=0.8'
        }
      });
      if (fallbackResp.ok) {
        const fallbackBuf = await fallbackResp.arrayBuffer();
        res.setHeader('Content-Type', 'image/png');
        res.setHeader('Cache-Control', 'public, max-age=86400');
        return res.status(200).send(Buffer.from(fallbackBuf));
      }
    } catch (_) {}

    return res.status(502).send('Failed to retrieve map tile from OneMap API');
  }
}
