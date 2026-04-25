import type { TicketAnalysisResult, MissingInfo } from '../../types/index.js';

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
      if (item && !item.toLowerCase().includes('none')) {
        items.push(item);
      }
    }
  }

  return items;
};

export const parseMissingInfo = (items: string[]): MissingInfo[] => {
  return items.map((item) => {
    const categoryMatch = item.match(/^\[([^\]]+)\]/);
    const importanceMatch = item.match(/\((critical|high|medium|low)\)/i);
    const descriptionMatch = item.match(/:\s*(.+)$/);

    return {
      category: categoryMatch ? categoryMatch[1] : 'General',
      importance: (importanceMatch
        ? importanceMatch[1].toLowerCase()
        : 'medium') as MissingInfo['importance'],
      description: descriptionMatch ? descriptionMatch[1] : item,
    };
  });
};

export const parseCompletenessAssessment = (text: string): boolean => {
  const regex = /##\s*Completeness Assessment[\s\S]*?(?=##|$)/i;
  const match = text.match(regex);
  if (!match) return false;

  const sectionText = match[0].toLowerCase();
  return sectionText.includes('yes') && !sectionText.includes('no,');
};

export const parseAnalysis = (
  rawAnalysis: string,
  issueKey: string,
  summary: string
): TicketAnalysisResult => {
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
