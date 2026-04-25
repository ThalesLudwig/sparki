import * as jira from '../../clients/jira.js';
import * as ollama from '../../clients/ollama.js';
import {
  SYSTEM_PROMPT,
  buildUserPrompt,
  SUMMARIZE_SYSTEM_PROMPT,
  buildSummarizePrompt,
} from './prompts/index.js';
import { parseAnalysis } from './parsers.js';
import { formatQuestionsAsComment } from './formatters.js';
import { analyzeDesignAssets } from './design.js';
import type { TicketAnalysisReport } from '../../types/index.js';

export { formatReport } from './formatters.js';

export interface AnalyzeOptions {
  context?: string;
  model?: string;
  postComment?: boolean;
}

export const analyze = async (
  issueKey: string,
  options: AnalyzeOptions = {}
): Promise<TicketAnalysisReport> => {
  const { context, model, postComment = false } = options;

  // Move ticket to In Progress
  console.log(`\n🚀 Moving ticket to In Progress...`);
  const transitioned = await jira.transitionToInProgress(issueKey);
  if (transitioned) {
    console.log('✅ Ticket moved to In Progress');
  }

  console.log(`\n📋 Fetching Jira ticket: ${issueKey}`);
  const issue = await jira.getIssue(issueKey);
  console.log(`📄 Ticket: "${issue.fields.summary}"`);
  console.log(`   Type: ${issue.fields.issuetype.name} | Status: ${issue.fields.status.name}`);

  console.log('💬 Fetching comments...');
  const comments = await jira.getIssueComments(issueKey);
  console.log(`   Found ${comments.length} comment(s)`);

  let ticketContent = jira.formatIssueForAnalysis(issue, comments);

  // Analyze design assets (Figma links + image attachments)
  const designDetails = await analyzeDesignAssets(issue, comments, issue.fields.summary, model);
  if (designDetails) {
    ticketContent += `\n\n## Design Analysis\n${designDetails}`;
  }

  console.log('\n🤖 Analyzing ticket with AI...');
  const rawAnalysis = await ollama.chat(
    SYSTEM_PROMPT,
    buildUserPrompt(ticketContent, context),
    model
  );
  const analysis = parseAnalysis(rawAnalysis, issueKey, issue.fields.summary);

  const criticalCount = analysis.missingInformation.filter(
    (m) => m.importance === 'critical'
  ).length;
  const highCount = analysis.missingInformation.filter((m) => m.importance === 'high').length;

  console.log(`\n📊 Analysis complete:`);
  console.log(`   - Ticket complete: ${analysis.isComplete ? '✅ Yes' : '❌ No'}`);
  console.log(
    `   - Missing info: ${analysis.missingInformation.length} items (${criticalCount} critical, ${highCount} high)`
  );
  console.log(`   - Questions: ${analysis.questions.length}`);

  let commentPosted = false;
  let commentId: string | undefined;

  const hasQuestions =
    analysis.missingInformation.length > 0 || analysis.questions.length > 0;

  if (postComment && hasQuestions) {
    console.log('\n📝 Posting questions as Jira comment...');
    const commentBody = formatQuestionsAsComment(analysis);
    try {
      const comment = await jira.postComment(issueKey, commentBody);
      commentPosted = true;
      commentId = comment.id;
      console.log(`✅ Comment posted successfully (ID: ${comment.id})`);
    } catch (error) {
      console.error('❌ Failed to post comment:', error);
    }
  } else if (postComment && !hasQuestions) {
    console.log('\n✅ No questions to post - skipping comment');
  }

  // Generate implementation prompt for engineering agent
  console.log('\n📝 Generating implementation prompt...');
  const implementationPrompt = await ollama.chat(
    SUMMARIZE_SYSTEM_PROMPT,
    buildSummarizePrompt(ticketContent),
    model
  );

  console.log('\n' + '='.repeat(60));
  console.log('🤖 IMPLEMENTATION PROMPT FOR ENGINEERING AGENT:');
  console.log('='.repeat(60));
  console.log(implementationPrompt);
  console.log('='.repeat(60));

  return {
    issueKey,
    summary: issue.fields.summary,
    issueType: issue.fields.issuetype.name,
    status: issue.fields.status.name,
    analyzedAt: new Date().toISOString(),
    analysis,
    commentPosted,
    commentId,
  };
};
