import tileHandler from '../tile.js';

/**
 * Catch-all handler for /api/tiles/:style/:z/:x/:y.png on Vercel.
 */
export default function handler(req, res) {
  if (req.query.slug && Array.isArray(req.query.slug)) {
    const [style, z, x, yPng] = req.query.slug;
    req.query.style = style || req.query.style || 'Night';
    req.query.z = z || req.query.z;
    req.query.x = x || req.query.x;
    req.query.y = yPng ? yPng.replace(/\.png$/i, '') : req.query.y;
  }
  return tileHandler(req, res);
}
