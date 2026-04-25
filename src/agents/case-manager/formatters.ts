import type { TicketAnalysisResult, TicketAnalysisReport } from '../../types/index.js';

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
      critical: analysis.missingInformation.filter((m) => m.importance === 'critical'),
      high: analysis.missingInformation.filter((m) => m.importance === 'high'),
      medium: analysis.missingInformation.filter((m) => m.importance === 'medium'),
      low: analysis.missingInformation.filter((m) => m.importance === 'low'),
    };

    if (byImportance.critical.length > 0) {
      output += '\n### 🔴 Critical\n';
      byImportance.critical.forEach((m) => {
        output += `- **[${m.category}]** ${m.description}\n`;
      });
    }

    if (byImportance.high.length > 0) {
      output += '\n### 🟠 High\n';
      byImportance.high.forEach((m) => {
        output += `- **[${m.category}]** ${m.description}\n`;
      });
    }

    if (byImportance.medium.length > 0) {
      output += '\n### 🟡 Medium\n';
      byImportance.medium.forEach((m) => {
        output += `- **[${m.category}]** ${m.description}\n`;
      });
    }

    if (byImportance.low.length > 0) {
      output += '\n### 🟢 Low\n';
      byImportance.low.forEach((m) => {
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
${analysis.recommendations.length > 0 ? analysis.recommendations.map((r) => `- ${r}`).join('\n') : '- None identified'}

---

## Comment Status
${report.commentPosted ? `✅ Questions posted as comment (ID: ${report.commentId})` : '⏭️ No comment posted'}
`;

  return output;
};
