export const buildSummarizePrompt = (
  ticketContent: string
): string => `Based on the following Jira ticket information, create a clear implementation prompt for an AI coding agent.

${ticketContent}

Create a structured implementation prompt with these sections:

## Task
A single clear sentence describing what needs to be built or fixed.

## Requirements
A bullet list of specific requirements extracted from the ticket and comments. Include:
- Functional requirements (what it should do)
- Technical requirements (specific values, APIs, etc.)
- UI/UX requirements (if applicable)

## Technical Context
- Repository/codebase to modify (if specified)
- Relevant files or components (if mentioned)
- Dependencies or integrations

## Acceptance Criteria
How to verify the implementation is complete.

## Additional Notes
Any other relevant context from the ticket or comments.

Be concise but complete. Extract ALL relevant information from both the description and comments.`;
