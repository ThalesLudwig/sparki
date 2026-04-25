import * as figma from '../../clients/figma.js';
import * as ollama from '../../clients/ollama.js';
import {
  SYSTEM_PROMPT,
  buildUserPrompt,
  IMAGE_SYSTEM_PROMPT,
  buildImagePrompt,
} from './prompts/index.js';
import { parseAnalysis, parseImageAnalysis } from './parsers.js';
import type { DesignAnalysisResult, DesignAnalysisReport, FigmaNode } from '../../types/index.js';

export type { ImageAnalysisResult } from './parsers.js';
export { formatReport, formatImageAnalysis } from './formatters.js';

export interface AnalyzeOptions {
  frameIds?: string[];
  context?: string;
  maxFrames?: number;
  imageScale?: number;
  model?: string;
  postComments?: boolean;
}

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

export const analyzeImage = async (
  imageBuffer: Buffer,
  imageName: string,
  ticketContext?: string,
  model?: string
): Promise<ReturnType<typeof parseImageAnalysis>> => {
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
