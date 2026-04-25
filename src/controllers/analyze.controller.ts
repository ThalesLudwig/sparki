import * as http from 'http';
import { sendJson, parseBody } from '../utils/http.js';
import * as analysisService from '../services/analysis.service.js';

interface AnalyzePayload {
  issueKey?: string;
  issue?: {
    key?: string;
  };
}

export const postAnalyze = async (
  req: http.IncomingMessage,
  res: http.ServerResponse
): Promise<void> => {
  try {
    const payload = await parseBody<AnalyzePayload>(req);
    const issueKey = payload.issueKey || payload.issue?.key;

    if (!issueKey) {
      sendJson(res, 400, { error: 'Missing issueKey in request body' });
      return;
    }

    sendJson(res, 202, {
      status: 'accepted',
      message: `Analysis started for ${issueKey}`,
      issueKey,
    });

    analysisService.runAnalysis(issueKey);
  } catch (error) {
    sendJson(res, 500, { error: 'Internal server error' });
  }
};
