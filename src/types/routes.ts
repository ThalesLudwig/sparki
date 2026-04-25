// ============================================
// Route Types
// ============================================

import type * as http from 'http';

export interface RouteHandler {
  (req: http.IncomingMessage, res: http.ServerResponse): Promise<void> | void;
}

export interface Route {
  method: string;
  path: string;
  handler: RouteHandler;
}
