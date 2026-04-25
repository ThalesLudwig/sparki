export const buildUserPrompt = (ticketContent: string): string => `
Analyze this Jira ticket:

${ticketContent}

⚠️ CHECK COMMENTS FIRST - they contain answers to previous questions.
"No need for X", "just use Y", "presume Z" = ANSWERED, not missing.

Respond in this format:

## Completeness Assessment
Can implementation start? (YES/NO) and brief reason.
If there's a mockup/screenshot and clear description, the answer is usually YES.

## Missing Information (only if truly blocking)
- [CATEGORY] (importance): What's missing

If the ticket has enough info to start, write: "None - ready to implement."

## Questions (only if critical)
Only list questions about core functionality that cannot be inferred.
If none, write: "None."

## Recommendations
Brief suggestions for implementation.`;
