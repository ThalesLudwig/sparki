import * as http from 'http';
import { sendJson } from '../utils/http.js';

export const getHealth = (_req: http.IncomingMessage, res: http.ServerResponse): void => {
  sendJson(res, 200, { status: 'ok', service: 'sparki' });
};
