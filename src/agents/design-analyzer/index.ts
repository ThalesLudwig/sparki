import * as figma from '../../clients/figma.js';
import * as ollama from '../../clients/ollama.js';
import {
  SYSTEM_PROMPT,
  buildUserPrompt,
  IMAGE_SYSTEM_PROMPT,
  buildImagePrompt,
} from './prompts.js';
import type { DesignAnalysisResult, DesignAnalysisReport, FigmaNode } from '../../types/index.js';

export interface AnalyzeOptions {
  frameIds?: string[];
  context?: string;
  maxFrames?: number;
  imageScale?: number;
  model?: string;
  postComments?: boolean;
}

export interface ImageAnalysisResult {
  imageName: string;
  description: string;
  uiElements: string[];
  specifications: string[];
  interactions: string[];
  rawAnalysis: string;
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
      const item = trimmed
        .replace(/^[-*]\s*/, '')
        .replace(/^\d+\.\s*/, '')
        .trim();
      if (item) {
        items.push(item);
      }
    }
  }

  return items;
};

const parseAnalysis = (
  rawAnalysis: string,
  frameName: string,
  frameId: string
): DesignAnalysisResult => ({
  frameName,
  frameId,
  scope: extractSection(rawAnalysis, 'Scope'),
  ambiguities: extractSection(rawAnalysis, 'Ambiguities'),
  missingSpecs: extractSection(rawAnalysis, 'Missing Specifications'),
  questions: extractSection(rawAnalysis, 'Questions for Designers'),
  suggestions: extractSection(rawAnalysis, 'Suggestions'),
  rawAnalysis,
});

export const analyze = async (
  fileKeyOrUrl: string,
  options: AnalyzeOptions = {}
): Promise<DesignAnalysisReport> => {
  const {
    frameIds: specifiedFrameIds,
    context,
    maxFrames = 10,
    imageScale = 2,
    model,
    postComments = false,
  } = options;

  const { fileKey, nodeId } = figma.extractFigmaInfo(fileKeyOrUrl);
  let frameIds = specifiedFrameIds || (nodeId ? [nodeId] : undefined);

  console.log(`\n📂 Fetching Figma file: ${fileKey}`);
  const file = await figma.getFile(fileKey);
  console.log(`📄 File: "${file.name}" (Last modified: ${file.lastModified})`);

  const allFrames = figma.extractFrames(file.document);
  let framesToAnalyze: FigmaNode[];

  if (frameIds && frameIds.length > 0) {
    framesToAnalyze = allFrames.filter((f) => frameIds!.includes(f.id));
    console.log(`🎯 Analyzing ${framesToAnalyze.length} specified frames`);
  } else {
    framesToAnalyze = allFrames.slice(0, maxFrames);
    console.log(`🖼️  Found ${allFrames.length} frames, analyzing first ${framesToAnalyze.length}`);
  }

  const analyses: DesignAnalysisResult[] = [];

  for (let i = 0; i < framesToAnalyze.length; i++) {
    const frame = framesToAnalyze[i];
    console.log(`\n🔍 Analyzing frame ${i + 1}/${framesToAnalyze.length}: "${frame.name}"`);

    try {
      const imageResponse = await figma.getImages(fileKey, [frame.id], 'png', imageScale);
      const imageUrl = imageResponse.images[frame.id];

      if (!imageUrl) {
        console.warn(`⚠️  No image URL returned for frame "${frame.name}"`);
        continue;
      }

      console.log('📥 Downloading frame image...');
      const imageBuffer = await figma.downloadImage(imageUrl);
      const base64Image = imageBuffer.toString('base64');

      console.log('🤖 Analyzing with vision model...');
      const rawAnalysis = await ollama.chatWithImage(
        SYSTEM_PROMPT,
        buildUserPrompt(frame.name, context),
        base64Image,
        model
      );
      const analysis = parseAnalysis(rawAnalysis, frame.name, frame.id);
      analyses.push(analysis);

      console.log(
        `✅ Found ${analysis.ambiguities.length} ambiguities, ${analysis.missingSpecs.length} missing specs, ${analysis.questions.length} questions`
      );

      if (postComments && analysis.questions.length > 0) {
        console.log(`💬 Posting ${analysis.questions.length} comments to Figma...`);
        for (const question of analysis.questions) {
          const commentBody = `🤖 **AI Design Question**\n\n${question}`;
          await figma.postComment(fileKey, commentBody, frame.id);
        }
      }
    } catch (error) {
      console.error(`❌ Error analyzing frame "${frame.name}":`, error);
    }
  }

  return {
    fileKey,
    fileName: file.name,
    analyzedAt: new Date().toISOString(),
    totalFramesFound: allFrames.length,
    totalFramesAnalyzed: analyses.length,
    analyses,
    summary: {
      totalAmbiguities: analyses.reduce((sum, a) => sum + a.ambiguities.length, 0),
      totalMissingSpecs: analyses.reduce((sum, a) => sum + a.missingSpecs.length, 0),
      totalQuestions: analyses.reduce((sum, a) => sum + a.questions.length, 0),
      totalSuggestions: analyses.reduce((sum, a) => sum + a.suggestions.length, 0),
    },
  };
};

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

const extractTextSection = (text: string, sectionName: string): string => {
  const regex = new RegExp(`##\\s*${sectionName}[\\s\\S]*?(?=##|$)`, 'i');
  const match = text.match(regex);
  if (!match) return '';
  return match[0].replace(new RegExp(`##\\s*${sectionName}`, 'i'), '').trim();
};

const parseImageAnalysis = (rawAnalysis: string, imageName: string): ImageAnalysisResult => ({
  imageName,
  description: extractTextSection(rawAnalysis, 'Description'),
  uiElements: extractSection(rawAnalysis, 'UI Elements'),
  specifications: extractSection(rawAnalysis, 'Specifications'),
  interactions: extractSection(rawAnalysis, 'Interactions'),
  rawAnalysis,
});

export const analyzeImage = async (
  imageBuffer: Buffer,
  imageName: string,
  ticketContext?: string,
  model?: string
): Promise<ImageAnalysisResult> => {
  const base64Image = imageBuffer.toString('base64');

  console.log(`🖼️  Analyzing image: ${imageName}`);
  const rawAnalysis = await ollama.chatWithImage(
    IMAGE_SYSTEM_PROMPT,
    buildImagePrompt(imageName, ticketContext),
    base64Image,
    model
  );

  return parseImageAnalysis(rawAnalysis, imageName);
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
