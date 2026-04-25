import type { ImageAnalysisResult } from './parsers.js';

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
