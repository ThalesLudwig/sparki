import * as jira from '../../clients/jira.js';
import * as figma from '../../clients/figma.js';
import * as ollama from '../../clients/ollama.js';
import * as designAnalyzer from '../design-analyzer/index.js';
import { SYSTEM_PROMPT, buildUserPrompt, SUMMARIZE_SYSTEM_PROMPT, buildSummarizePrompt } from './prompts.js';
import type { TicketAnalysisResult, TicketAnalysisReport, MissingInfo, JiraIssue, JiraComment } from '../../types/index.js';

export interface AnalyzeOptions {
  context?: string;
  model?: string;
  postComment?: boolean;
}

const extractSection = (text: string, sectionName: string): string[] => {
  const regex = new RegExp(`##\\s*${sectionName}[\\s\\S]*?(?=##|$)`, 'i');
  const match = text.match(regex);
  if (!match) return [];

  const sectionText = match[0];
  const lines = sectionText.split('\n').slice(1);
  const items: string[] = [];

  for (const line of lines) {
    const trimmed = line.trim();
    if (trimmed.startsWith('-') || trimmed.startsWith('*') || trimmed.match(/^\d+\./)) {
      const item = trimmed.replace(/^[-*]\s*/, '').replace(/^\d+\.\s*/, '').trim();
      if (item && !item.toLowerCase().includes('none')) {
        items.push(item);
      }
    }
  }

  return items;
};

const parseMissingInfo = (items: string[]): MissingInfo[] => {
  return items.map(item => {
    const categoryMatch = item.match(/^\[([^\]]+)\]/);
    const importanceMatch = item.match(/\((critical|high|medium|low)\)/i);
    const descriptionMatch = item.match(/:\s*(.+)$/);

    return {
      category: categoryMatch ? categoryMatch[1] : 'General',
      importance: (importanceMatch ? importanceMatch[1].toLowerCase() : 'medium') as MissingInfo['importance'],
      description: descriptionMatch ? descriptionMatch[1] : item,
    };
  });
};

const parseCompletenessAssessment = (text: string): boolean => {
  const regex = /##\s*Completeness Assessment[\s\S]*?(?=##|$)/i;
  const match = text.match(regex);
  if (!match) return false;

  const sectionText = match[0].toLowerCase();
  return sectionText.includes('yes') && !sectionText.includes('no,');
};

const parseAnalysis = (rawAnalysis: string, issueKey: string, summary: string): TicketAnalysisResult => {
  const missingInfoItems = extractSection(rawAnalysis, 'Missing Information');
  const questions = extractSection(rawAnalysis, 'Questions for Ticket Author');
  const recommendations = extractSection(rawAnalysis, 'Recommendations');

  return {
    issueKey,
    summary,
    isComplete: parseCompletenessAssessment(rawAnalysis),
    missingInformation: parseMissingInfo(missingInfoItems),
    questions,
    recommendations,
    rawAnalysis,
  };
};

const analyzeDesignAssets = async (
  issue: JiraIssue,
  comments: JiraComment[],
  ticketSummary: string,
  model?: string
): Promise<string | null> => {
  const results: string[] = [];

  // 1. Check for Figma links
  const figmaLinks = jira.extractFigmaLinks(issue, comments);
  if (figmaLinks.length > 0) {
    console.log(`\n🎨 Found ${figmaLinks.length} Figma link(s)`);
    for (const link of figmaLinks) {
      try {
        const { fileKey, nodeId } = figma.extractFigmaInfo(link);
        console.log(`   Analyzing Figma: ${fileKey}${nodeId ? ` (node: ${nodeId})` : ''}`);
        
        const report = await designAnalyzer.analyze(link, {
          maxFrames: 3,
          context: ticketSummary,
          model,
        });
        
        for (const analysis of report.analyses) {
          results.push(`### Figma Frame: ${analysis.frameName}`);
          if (analysis.scope.length > 0) {
            results.push(`**Scope:** ${analysis.scope.join(', ')}`);
          }
          if (analysis.missingSpecs.length > 0) {
            results.push(`**Specifications:**\n${analysis.missingSpecs.map(s => `- ${s}`).join('\n')}`);
          }
          if (analysis.ambiguities.length > 0) {
            results.push(`**Notes:**\n${analysis.ambiguities.map(a => `- ${a}`).join('\n')}`);
          }
          results.push('');
        }
      } catch (error) {
        console.error(`   ❌ Failed to analyze Figma link: ${error}`);
      }
    }
  }

  // 2. Check for image attachments
  const imageAttachments = jira.extractImageAttachments(issue);
  if (imageAttachments.length > 0) {
    console.log(`\n🖼️  Found ${imageAttachments.length} image attachment(s)`);
    for (const attachment of imageAttachments) {
      try {
        console.log(`   Downloading: ${attachment.filename}`);
        const imageBuffer = await jira.downloadAttachment(attachment.url);
        
        const analysis = await designAnalyzer.analyzeImage(
          imageBuffer,
          attachment.filename,
          ticketSummary,
          model
        );
        
        results.push(designAnalyzer.formatImageAnalysis(analysis));
      } catch (error) {
        console.error(`   ❌ Failed to analyze attachment ${attachment.filename}: ${error}`);
      }
    }
  }

  if (results.length === 0) {
    return null;
  }

  return results.join('\n');
};

const formatQuestionsAsComment = (analysis: TicketAnalysisResult): string => {
  const lines: string[] = [
    '🤖 AI Ticket Analysis - Questions for Clarification',
    '',
    'The following questions need to be answered before this ticket can be implemented:',
    '',
  ];

  const critical = analysis.missingInformation.filter(m => m.importance === 'critical');
  const high = analysis.missingInformation.filter(m => m.importance === 'high');

  if (critical.length > 0) {
    lines.push('🔴 CRITICAL (blocking implementation):');
    critical.forEach(m => lines.push(`• [${m.category}] ${m.description}`));
    lines.push('');
  }

  if (high.length > 0) {
    lines.push('🟠 HIGH PRIORITY:');
    high.forEach(m => lines.push(`• [${m.category}] ${m.description}`));
    lines.push('');
  }

  if (analysis.questions.length > 0) {
    lines.push('❓ Questions:');
    analysis.questions.forEach((q, i) => lines.push(`${i + 1}. ${q}`));
    lines.push('');
  }

  lines.push('---');
  lines.push('This analysis was generated automatically. Please update the ticket with the requested information.');

  return lines.join('\n');
};

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
  const rawAnalysis = await ollama.chat(SYSTEM_PROMPT, buildUserPrompt(ticketContent, context), model);
  const analysis = parseAnalysis(rawAnalysis, issueKey, issue.fields.summary);

  const criticalCount = analysis.missingInformation.filter(m => m.importance === 'critical').length;
  const highCount = analysis.missingInformation.filter(m => m.importance === 'high').length;

  console.log(`\n📊 Analysis complete:`);
  console.log(`   - Ticket complete: ${analysis.isComplete ? '✅ Yes' : '❌ No'}`);
  console.log(`   - Missing info: ${analysis.missingInformation.length} items (${criticalCount} critical, ${highCount} high)`);
  console.log(`   - Questions: ${analysis.questions.length}`);

  let commentPosted = false;
  let commentId: string | undefined;

  const hasCriticalIssues = criticalCount > 0;

  if (postComment && hasCriticalIssues) {
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
  } else if (postComment && !hasCriticalIssues) {
    console.log('\n✅ No critical issues remaining - skipping comment');
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

export const formatReport = (report: TicketAnalysisReport): string => {
  const { analysis } = report;

  let output = `
# Jira Ticket Analysis Report

**Ticket:** ${report.issueKey}
**Summary:** ${report.summary}
**Type:** ${report.issueType}
**Status:** ${report.status}
**Analyzed:** ${report.analyzedAt}

## Completeness Assessment
${analysis.isComplete ? '✅ **Ready for implementation**' : '❌ **Needs more information**'}

---

## Missing Information
`;

  if (analysis.missingInformation.length === 0) {
    output += '- None identified\n';
  } else {
    const byImportance = {
      critical: analysis.missingInformation.filter(m => m.importance === 'critical'),
      high: analysis.missingInformation.filter(m => m.importance === 'high'),
      medium: analysis.missingInformation.filter(m => m.importance === 'medium'),
      low: analysis.missingInformation.filter(m => m.importance === 'low'),
    };

    if (byImportance.critical.length > 0) {
      output += '\n### 🔴 Critical\n';
      byImportance.critical.forEach(m => {
        output += `- **[${m.category}]** ${m.description}\n`;
      });
    }

    if (byImportance.high.length > 0) {
      output += '\n### 🟠 High\n';
      byImportance.high.forEach(m => {
        output += `- **[${m.category}]** ${m.description}\n`;
      });
    }

    if (byImportance.medium.length > 0) {
      output += '\n### 🟡 Medium\n';
      byImportance.medium.forEach(m => {
        output += `- **[${m.category}]** ${m.description}\n`;
      });
    }

    if (byImportance.low.length > 0) {
      output += '\n### 🟢 Low\n';
      byImportance.low.forEach(m => {
        output += `- **[${m.category}]** ${m.description}\n`;
      });
    }
  }

  output += `
---

## Questions for Ticket Author
${analysis.questions.length > 0 ? analysis.questions.map((q, i) => `${i + 1}. ${q}`).join('\n') : '- None identified'}

---

## Recommendations
${analysis.recommendations.length > 0 ? analysis.recommendations.map(r => `- ${r}`).join('\n') : '- None identified'}

---

## Comment Status
${report.commentPosted ? `✅ Questions posted as comment (ID: ${report.commentId})` : '⏭️ No comment posted'}
`;

  return output;
};
