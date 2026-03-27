import * as caseManager from '../agents/case-manager/index.js';
import * as ollama from '../clients/ollama.js';
import * as jira from '../clients/jira.js';
import { saveReport } from '../utils/report.js';

const extractIssueKey = (input: string): string => {
  const urlMatch = input.match(/browse\/([A-Z]+-\d+)/i);
  if (urlMatch) return urlMatch[1].toUpperCase();

  const keyMatch = input.match(/^([A-Z]+-\d+)$/i);
  if (keyMatch) return keyMatch[1].toUpperCase();

  return input;
};

export const runAnalyze = async (args: string[]) => {
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
