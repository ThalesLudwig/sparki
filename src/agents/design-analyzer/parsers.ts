import type { DesignAnalysisResult, ImageAnalysisResult } from '../../types/index.js';

export type { ImageAnalysisResult } from '../../types/index.js';

export const extractSection = (text: string, sectionName: string): string[] => {
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

const extractTextSection = (text: string, sectionName: string): string => {
  const regex = new RegExp(`##\\s*${sectionName}[\\s\\S]*?(?=##|$)`, 'i');
  const match = text.match(regex);
  if (!match) return '';
  return match[0].replace(new RegExp(`##\\s*${sectionName}`, 'i'), '').trim();
};

export const parseAnalysis = (
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

export const parseImageAnalysis = (rawAnalysis: string, imageName: string): ImageAnalysisResult => ({
  imageName,
  description: extractTextSection(rawAnalysis, 'Description'),
  uiElements: extractSection(rawAnalysis, 'UI Elements'),
  specifications: extractSection(rawAnalysis, 'Specifications'),
  interactions: extractSection(rawAnalysis, 'Interactions'),
  rawAnalysis,
});
