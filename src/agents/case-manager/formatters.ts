import type { TicketAnalysisResult } from '../../types/index.js';

export const formatQuestionsAsComment = (analysis: TicketAnalysisResult): string => {
  const lines: string[] = [
    '🤖 [SPARKI Logger] - Questions for Clarification',
    '',
    'The following questions need to be answered before this ticket can be implemented:',
    '',
  ];

  const critical = analysis.missingInformation.filter((m) => m.importance === 'critical');
  const high = analysis.missingInformation.filter((m) => m.importance === 'high');
  const medium = analysis.missingInformation.filter((m) => m.importance === 'medium');
  const low = analysis.missingInformation.filter((m) => m.importance === 'low');

  if (critical.length > 0) {
    lines.push('🔴 CRITICAL (blocking implementation):');
    critical.forEach((m) => lines.push(`• [${m.category}] ${m.description}`));
    lines.push('');
  }

  if (high.length > 0) {
    lines.push('🟠 HIGH PRIORITY:');
    high.forEach((m) => lines.push(`• [${m.category}] ${m.description}`));
    lines.push('');
  }

  if (medium.length > 0) {
    lines.push('🟡 MEDIUM:');
    medium.forEach((m) => lines.push(`• [${m.category}] ${m.description}`));
    lines.push('');
  }

  if (low.length > 0) {
    lines.push('🟢 LOW:');
    low.forEach((m) => lines.push(`• [${m.category}] ${m.description}`));
    lines.push('');
  }

  lines.push('---');
  lines.push(
    'This analysis was generated automatically. Please update the ticket with the requested information.'
  );

  return lines.join('\n');
};
