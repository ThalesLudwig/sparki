export const buildUserPrompt = (ticketContent: string): string => `
Analyze this Jira engineering ticket and identify what information is STILL missing for an AI engineering agent to implement it.

${ticketContent}

CRITICAL INSTRUCTIONS:
1. Read the ENTIRE ticket including ALL comments carefully
2. Information provided in comments counts as answered - do NOT ask for it again
3. Only list information that is genuinely NOT present anywhere in the ticket or comments
4. If a question was asked before and answered in a comment, that information is now available

Provide your analysis in this exact format:

## Completeness Assessment
State whether the ticket has enough information to begin implementation (YES/NO) and briefly explain why. Consider ALL information from both the description AND comments.

## Missing Information
For each piece of information that is STILL missing (not answered anywhere), use this format:
- [CATEGORY] (importance): Description of what's missing

Categories: Repository, Technical Specs, UI/UX, Business Logic, Dependencies, Testing, Design

If all critical information has been provided (in description or comments), write "None - all critical information has been provided."

## Questions for Ticket Author
List ONLY questions that have NOT been answered in the description or comments. If all questions have been answered, write "None - all questions have been answered."

## Recommendations
Suggestions for improving the ticket or things to consider during implementation.`;
