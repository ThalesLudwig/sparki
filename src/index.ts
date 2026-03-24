#!/usr/bin/env node
import { config } from 'dotenv';
config();

import * as caseManager from './agents/case-manager/index.js';
import * as designAnalyzer from './agents/design-analyzer/index.js';
import * as ollama from './clients/ollama.js';
import * as jira from './clients/jira.js';
import * as figma from './clients/figma.js';
import * as fs from 'fs/promises';

const printHelp = () => {
  console.log(`
SPARKi - AI-powered Jira Ticket Automation

Usage:
  sparki <command> [options]

Commands:
  analyze <issue-key>     Analyze a Jira ticket for missing information
  design <figma-url>      Analyze a Figma design for ambiguities

Options for 'analyze':
  --context <text>        Additional context about the project
  --model <name>          Ollama model to use (default: llama3.2)
  --comment               Post questions as a comment in Jira

Options for 'design':
  --frames <id1,id2>      Analyze specific frame IDs only
  --context <text>        Additional context about the design
  --max <number>          Maximum frames to analyze (default: 10)
  --model <name>          Ollama vision model (default: llava)
  --comment               Post questions as comments in Figma

Examples:
  sparki analyze PROJ-123
  sparki analyze PROJ-123 --comment
  sparki design https://figma.com/file/ABC123/MyDesign
  sparki design ABC123 --frames "1:2,1:3" --max 5

Environment Variables:
  JIRA_BASE_URL           Jira instance URL
  JIRA_EMAIL              Jira account email
  JIRA_API_TOKEN          Jira API token
  FIGMA_ACCESS_TOKEN      Figma personal access token
  OLLAMA_MODEL            Default text model (default: llama3.2)
  OLLAMA_VISION_MODEL     Default vision model (default: llava)
`);
};

const extractIssueKey = (input: string): string => {
  const urlMatch = input.match(/browse\/([A-Z]+-\d+)/i);
  if (urlMatch) return urlMatch[1].toUpperCase();

  const keyMatch = input.match(/^([A-Z]+-\d+)$/i);
  if (keyMatch) return keyMatch[1].toUpperCase();

  return input;
};

const saveReport = async (name: string, key: string, report: object) => {
  const reportsDir = 'reports';
  await fs.mkdir(reportsDir, { recursive: true });
  const fileName = `${reportsDir}/${name}-${key}-${Date.now()}.json`;
  await fs.writeFile(fileName, JSON.stringify(report, null, 2));
  console.log(`\n📁 Report saved to: ${fileName}`);
};

const runAnalyze = async (args: string[]) => {
  if (args.length === 0) {
    console.error('❌ Missing issue key. Usage: sparki analyze <issue-key>');
    process.exit(1);
  }

  const issueKey = extractIssueKey(args[0]);
  let context: string | undefined;
  let model: string | undefined;
  let postComment = false;

  for (let i = 1; i < args.length; i++) {
    switch (args[i]) {
      case '--context':
        context = args[++i];
        break;
      case '--model':
        model = args[++i];
        break;
      case '--comment':
        postComment = true;
        break;
    }
  }

  console.log('🔌 Checking connections...');
  const ollamaOk = await ollama.checkConnection(model);
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

  const report = await caseManager.analyze(issueKey, { context, model, postComment });
  console.log('\n' + '='.repeat(60));
  console.log(caseManager.formatReport(report));
  await saveReport('ticket-analysis', issueKey, report);
};

const runDesign = async (args: string[]) => {
  if (args.length === 0) {
    console.error('❌ Missing Figma URL. Usage: sparki design <figma-url>');
    process.exit(1);
  }

  const figmaUrl = args[0];
  let frameIds: string[] | undefined;
  let context: string | undefined;
  let maxFrames = 10;
  let model: string | undefined;
  let postComments = false;

  for (let i = 1; i < args.length; i++) {
    switch (args[i]) {
      case '--frames':
        frameIds = args[++i]?.split(',').map(id => id.trim().replace('-', ':'));
        break;
      case '--context':
        context = args[++i];
        break;
      case '--max':
        maxFrames = parseInt(args[++i], 10);
        break;
      case '--model':
        model = args[++i];
        break;
      case '--comment':
        postComments = true;
        break;
    }
  }

  console.log('🔌 Checking connections...');
  const ollamaOk = await ollama.checkConnection(model);
  if (!ollamaOk) {
    console.error('❌ Failed to connect to Ollama');
    process.exit(1);
  }
  console.log('✅ Ollama connected');

  const figmaOk = await figma.checkConnection();
  if (!figmaOk) {
    console.error('❌ Failed to connect to Figma');
    process.exit(1);
  }
  console.log('✅ Figma connected');

  const { fileKey } = figma.extractFigmaInfo(figmaUrl);
  const report = await designAnalyzer.analyze(figmaUrl, { frameIds, context, maxFrames, model, postComments });
  console.log('\n' + '='.repeat(60));
  console.log(designAnalyzer.formatReport(report));
  await saveReport('design-analysis', fileKey, report);
};

const main = async () => {
  const args = process.argv.slice(2);

  if (args.length === 0 || args[0] === '--help' || args[0] === '-h') {
    printHelp();
    process.exit(0);
  }

  const command = args[0];
  const commandArgs = args.slice(1);

  console.log('⚡ SPARKi - AI Ticket Automation');
  console.log('================================\n');

  try {
    switch (command) {
      case 'analyze':
        await runAnalyze(commandArgs);
        break;
      case 'design':
        await runDesign(commandArgs);
        break;
      default:
        console.error(`❌ Unknown command: ${command}`);
        printHelp();
        process.exit(1);
    }
  } catch (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  }
};

main();
