import 'dotenv/config';
import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import { apiRouter, authMiddleware } from './server/routes.js';
import { db } from './server/db.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function startServer() {
  // All data lives in Supabase only: load it (fails fast if env vars are missing)
  await db.init();

  const app = express();
  const PORT = Number(process.env.PORT) || 3000;

  // Trust the reverse proxy (Render/Netlify/Vercel) so client IPs are accurate
  app.set('trust proxy', true);

  // JSON body parser with generous limit
  app.use(express.json({ limit: '10mb' }));
  app.use(express.urlencoded({ extended: true, limit: '10mb' }));

  // Global auth middleware (extracts Bearer token if provided)
  app.use(authMiddleware);

  // Mount API endpoints
  app.use('/api', apiRouter);

  const isProduction = process.env.NODE_ENV === 'production';

  if (!isProduction) {
    // Development mode: mount Vite middleware
    const { createServer } = await import('vite');
    const vite = await createServer({
      server: {
        middlewareMode: true,
        host: '0.0.0.0',
        port: PORT,
      },
      appType: 'spa',
    });

    app.use(vite.middlewares);
  } else {
    // Production mode: serve built assets from dist
    const distPath = path.resolve(__dirname, 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  // Central error handler for async route failures (e.g. Supabase write errors)
  app.use((err: unknown, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
    console.error('[GeoAttend] API error:', err);
    res.status(500).json({
      error: err instanceof Error ? err.message : 'A database error occurred. Please try again.',
    });
  });

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`[GeoAttend] Server listening on port ${PORT} (bound to 0.0.0.0)`);
    console.log(`[GeoAttend] Open in your browser: http://localhost:${PORT}`);
  });
}

startServer().catch((err) => {
  console.error('[GeoAttend] Failed to start server:', err);
  process.exit(1);
});
