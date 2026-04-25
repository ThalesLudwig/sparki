import * as http from 'http';
import * as healthController from '../controllers/health.controller.js';
import * as analyzeController from '../controllers/analyze.controller.js';
import { sendJson } from '../utils/http.js';
import type { RouteHandler, Route } from '../types/index.js';

export type { RouteHandler, Route } from '../types/index.js';

const routes: Route[] = [
  { method: 'GET', path: '/health', handler: healthController.getHealth },
  { method: 'POST', path: '/analyze', handler: analyzeController.postAnalyze },
];

export const handleRequest = async (
  req: http.IncomingMessage,
  res: http.ServerResponse
): Promise<void> => {
  const url = req.url || '/';
  const method = req.method || 'GET';

  console.log(`${method} ${url}`);

  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (method === 'OPTIONS') {
    res.writeHead(204);
    res.end();
    return;
  }

  const route = routes.find((r) => r.method === method && r.path === url);

  if (route) {
    await route.handler(req, res);
  } else {
    sendJson(res, 404, { error: 'Not found' });
  }
};
