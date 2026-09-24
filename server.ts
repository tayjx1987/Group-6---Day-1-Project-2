import express from 'express';
import { createServer as createViteServer } from 'vite';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';

// Import API handlers
import healthHandler from './api/health.js';
import geocodeHandler from './api/geocode.js';
import resaleHandler from './api/resale-data.js';
import tileHandler from './api/tile.js';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function startServer() {
  const app = express();
  const PORT = Number(process.env.PORT) || 3000;
  const isProduction = process.env.NODE_ENV === 'production';

  app.use(express.json());

  // Mount API endpoints
  app.get('/api/health', (req, res) => {
    return healthHandler(req, res);
  });

  app.get('/api/geocode', (req, res) => {
    return geocodeHandler(req, res);
  });

  app.get('/api/resale-data', (req, res) => {
    return resaleHandler(req, res);
  });

  app.get('/api/tile', (req, res) => {
    return tileHandler(req, res);
  });

  // Support path parameter style /api/tiles/:style/:z/:x/:y.png
  app.get('/api/tiles/:style/:z/:x/:y.png', (req, res) => {
    req.query.style = req.params.style;
    req.query.z = req.params.z;
    req.query.x = req.params.x;
    req.query.y = req.params.y;
    return tileHandler(req, res);
  });

  if (!isProduction) {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    app.use(express.static(path.join(__dirname, 'dist')));
    app.get('*', (_req, res) => {
      res.sendFile(path.join(__dirname, 'dist', 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    // Note: Do not log any keys or sensitive credentials
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
