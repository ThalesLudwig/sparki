#!/usr/bin/env node
import { config } from 'dotenv';
config();

import * as http from 'http';
import * as ollama from './clients/ollama.js';
import * as jira from './clients/jira.js';
import { displayBanner } from './utils/banner.js';
import { handleRequest } from './routes/index.js';

const PORT = parseInt(process.env.PORT || '3001', 10);

const server = http.createServer(handleRequest);

const startServer = async (): Promise<void> => {
  displayBanner();
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
