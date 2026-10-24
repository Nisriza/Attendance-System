import type { IncomingMessage, ServerResponse } from 'http';
import { getApp } from '../server/app.js';

export default async function handler(req: IncomingMessage, res: ServerResponse) {
  const app = await getApp();
  app(req as any, res as any);
}
