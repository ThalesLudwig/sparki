import * as jira from '../../clients/jira.js';
import * as figma from '../../clients/figma.js';
import * as designAnalyzer from '../design-analyzer/index.js';
import type { JiraIssue, JiraComment } from '../../types/index.js';

export const analyzeDesignAssets = async (
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
            results.push(
              `**Specifications:**\n${analysis.missingSpecs.map((s) => `- ${s}`).join('\n')}`
            );
          }
          if (analysis.ambiguities.length > 0) {
            results.push(`**Notes:**\n${analysis.ambiguities.map((a) => `- ${a}`).join('\n')}`);
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
