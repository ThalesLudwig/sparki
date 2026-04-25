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
import { findRepositoryFromTitle } from '../../config/repositories.js';
import type { CaseManagerAnalyzeOptions as AnalyzeOptions } from '../../types/index.js';
export type { CaseManagerAnalyzeOptions as AnalyzeOptions } from '../../types/index.js';

export const analyze = async (
  issueKey: string,
  options: AnalyzeOptions = {}
) => {
  const { model, postComment = false } = options;

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
  const allComments = await jira.getIssueComments(issueKey);
  const comments = allComments.filter(
    (c) => !jira.extractTextFromDescription(c.body).includes('[SPARKI Logger]')
  );

  let ticketContent = jira.formatIssueForAnalysis(issue, comments);

  // Check for repository from title mapping
  const repositoryLink = findRepositoryFromTitle(issue.fields.summary);
  if (repositoryLink) {
    console.log(`🔗 Repository detected from title: ${repositoryLink}`);
    ticketContent += `\n\n## Repository\n${repositoryLink}`;
  }

  // Analyze design assets (Figma links + image attachments)
  const designDetails = await analyzeDesignAssets(issue, comments, issue.fields.summary, model);
  if (designDetails) {
    ticketContent += `\n\n## Design Analysis\n${designDetails}`;
  }

  console.log('\n🤖 Analyzing ticket with AI...');
  const userPrompt = buildUserPrompt(ticketContent);
  const rawAnalysis = await ollama.chat(SYSTEM_PROMPT, userPrompt, model);
  const analysis = parseAnalysis(rawAnalysis, issueKey, issue.fields.summary);

  console.log(`\n📊 Analysis complete: ${analysis.isComplete ? '✅ Yes' : '❌ No'}`);

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

      // Move ticket back to TODO since clarifications are needed
      console.log(`\n🔙 Moving ticket back to TODO (awaiting clarifications)...`);
      const movedToTodo = await jira.transitionToTodo(issueKey);
      if (movedToTodo) {
        console.log('✅ Ticket moved back to TODO');
      }
    } catch (error) {
      console.error('❌ Failed to post comment:', error);
    }
  } else if (postComment && !hasQuestions) {
    console.log('\n✅ No questions to post - skipping comment');
  }

  let implementationPrompt: string | undefined;

  // Only generate implementation prompt if analysis is complete with no questions
  if (!hasQuestions) {
    console.log('\n📝 Generating implementation prompt...');
    implementationPrompt = await ollama.chat(
      SUMMARIZE_SYSTEM_PROMPT,
      buildSummarizePrompt(ticketContent, repositoryLink),
      model
    );

    console.log('\n' + '='.repeat(60));
    console.log('🤖 IMPLEMENTATION PROMPT FOR ENGINEERING AGENT:');
    console.log('='.repeat(60));
    console.log(implementationPrompt);
    console.log('='.repeat(60));
  } else {
    console.log('\n⏸️  Skipping implementation prompt - awaiting clarifications');
  }

  return { analysis, commentPosted, commentId };
};
