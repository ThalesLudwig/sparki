import type { DesignAnalysisReport } from '../../types/index.js';
import type { ImageAnalysisResult } from './parsers.js';

export const formatReport = (report: DesignAnalysisReport): string => {
  let output = `
# Figma Design Analysis Report

**File:** ${report.fileName}
**Analyzed:** ${report.analyzedAt}
**Frames Analyzed:** ${report.totalFramesAnalyzed} of ${report.totalFramesFound}

## Summary
- **Ambiguities Found:** ${report.summary.totalAmbiguities}
- **Missing Specifications:** ${report.summary.totalMissingSpecs}
- **Questions for Designers:** ${report.summary.totalQuestions}
- **Suggestions:** ${report.summary.totalSuggestions}

---
`;

  for (const analysis of report.analyses) {
    output += `
## Frame: ${analysis.frameName}
**ID:** ${analysis.frameId}

### Scope
${analysis.scope.length > 0 ? analysis.scope.map((s) => `- ${s}`).join('\n') : '- Full screen analysis'}

### Ambiguities
${analysis.ambiguities.length > 0 ? analysis.ambiguities.map((a) => `- ${a}`).join('\n') : '- None identified'}

### Missing Specifications
${analysis.missingSpecs.length > 0 ? analysis.missingSpecs.map((s) => `- ${s}`).join('\n') : '- None identified'}

### Questions for Designers
${analysis.questions.length > 0 ? analysis.questions.map((q) => `- ${q}`).join('\n') : '- None identified'}

### Suggestions
${analysis.suggestions.length > 0 ? analysis.suggestions.map((s) => `- ${s}`).join('\n') : '- None identified'}

---
`;
  }

  return output;
};

export const formatImageAnalysis = (analysis: ImageAnalysisResult): string => {
  let output = `### Image: ${analysis.imageName}\n\n`;

  if (analysis.description) {
    output += `**Description:** ${analysis.description}\n\n`;
  }

  if (analysis.uiElements.length > 0) {
    output += `**UI Elements:**\n${analysis.uiElements.map((e) => `- ${e}`).join('\n')}\n\n`;
  }

  if (analysis.specifications.length > 0) {
    output += `**Specifications:**\n${analysis.specifications.map((s) => `- ${s}`).join('\n')}\n\n`;
  }

  if (analysis.interactions.length > 0) {
    output += `**Interactions:**\n${analysis.interactions.map((i) => `- ${i}`).join('\n')}\n\n`;
  }

  return output;
};
