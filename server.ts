import { getApp } from './server/app.js';

const PORT = Number(process.env.PORT) || 3000;

async function startServer() {
  const app = await getApp();

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`[GeoAttend] Server listening on port ${PORT} (bound to 0.0.0.0)`);
    console.log(`[GeoAttend] Open in your browser: http://localhost:${PORT}`);
  });
}

startServer().catch((err) => {
  console.error('[GeoAttend] Failed to start server:', err);
  process.exit(1);
});
