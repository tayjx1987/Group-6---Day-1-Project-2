import express from 'express';
import { createServer as createViteServer } from 'vite';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';

// Import API handlers
import healthHandler from './api/health.js';
import geocodeHandler from './api/geocode.js';
import resaleHandler from './api/resale-data.js';

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
