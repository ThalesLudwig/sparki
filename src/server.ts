#!/usr/bin/env node
import { config } from 'dotenv';
config();

import * as http from 'http';
import * as caseManager from './agents/case-manager/index.js';
import * as ollama from './clients/ollama.js';
import * as jira from './clients/jira.js';
import { displayBanner } from './utils/banner.js';

const PORT = parseInt(process.env.PORT || '3001', 10);

interface WebhookPayload {
  issueKey?: string;
  issue?: {
    key?: string;
  };
}

const parseBody = (req: http.IncomingMessage): Promise<WebhookPayload> => {
  return new Promise((resolve, reject) => {
    let body = '';
    req.on('data', (chunk) => (body += chunk));
    req.on('end', () => {
      try {
        resolve(body ? JSON.parse(body) : {});
      } catch (e) {
        reject(new Error('Invalid JSON'));
      }
    });
    req.on('error', reject);
  });
};

const sendJson = (res: http.ServerResponse, status: number, data: object) => {
  res.writeHead(status, { 'Content-Type': 'application/json' });
  res.end(JSON.stringify(data));
};

const handleAnalyze = async (req: http.IncomingMessage, res: http.ServerResponse) => {
  try {
    const payload = await parseBody(req);
    const issueKey = payload.issueKey || payload.issue?.key;

    if (!issueKey) {
      sendJson(res, 400, { error: 'Missing issueKey in request body' });
      return;
    }

    console.log(`\n📥 Webhook received for: ${issueKey}`);

    // Run analysis asynchronously - respond immediately
    sendJson(res, 202, {
      status: 'accepted',
      message: `Analysis started for ${issueKey}`,
      issueKey,
    });

    // Process in background
    try {
      const report = await caseManager.analyze(issueKey, { postComment: true });
      console.log(`✅ Analysis complete for ${issueKey}`);
      console.log(`   - Complete: ${report.analysis.isComplete}`);
      console.log(`   - Comment posted: ${report.commentPosted}`);
    } catch (error) {
      console.error(`❌ Analysis failed for ${issueKey}:`, error);
    }
  } catch (error) {
    console.error('❌ Webhook error:', error);
    sendJson(res, 500, { error: 'Internal server error' });
  }
};

const handleHealth = (_req: http.IncomingMessage, res: http.ServerResponse) => {
  sendJson(res, 200, { status: 'ok', service: 'sparki' });
};

const server = http.createServer(async (req, res) => {
  const url = req.url || '/';
  const method = req.method || 'GET';

  console.log(`${method} ${url}`);

  // CORS headers for flexibility
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (method === 'OPTIONS') {
    res.writeHead(204);
    res.end();
    return;
  }

  if (url === '/health' && method === 'GET') {
    handleHealth(req, res);
  } else if (url === '/analyze' && method === 'POST') {
    await handleAnalyze(req, res);
  } else {
    sendJson(res, 404, { error: 'Not found' });
  }
});

const startServer = async () => {
  displayBanner();
  console.log('⚡ SPARKi Webhook Server');
  console.log('========================\n');

  console.log('🔌 Checking connections...');

  const ollamaOk = await ollama.checkConnection();
  if (!ollamaOk) {
    console.error('❌ Failed to connect to Ollama');
    process.exit(1);
  }
  console.log('✅ Ollama connected');

  const jiraOk = await jira.checkConnection();
  if (!jiraOk) {
    console.error('❌ Failed to connect to Jira');
    process.exit(1);
  }
  console.log('✅ Jira connected');

  server.listen(PORT, () => {
    console.log(`\n🚀 Server listening on http://localhost:${PORT}`);
    console.log(`\n📡 Endpoints:`);
    console.log(`   POST /analyze  - Analyze a Jira ticket`);
    console.log(`   GET  /health   - Health check`);
    console.log(`\n💡 Jira Automation Setup:`);
    console.log(`   URL:    http://your-server:${PORT}/analyze`);
    console.log(`   Method: POST`);
    console.log(`   Body:   { "issueKey": "{{issue.key}}" }`);
  });
};

startServer();
