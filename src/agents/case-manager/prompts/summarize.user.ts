export const buildSummarizePrompt = (
  ticketContent: string
): string => `Based on the following Jira ticket information, create a clear implementation prompt for an AI coding agent.

${ticketContent}

IMPORTANT: The AI coding agent will NOT have access to any images, screenshots, or Figma files. You MUST convert ALL visual information into explicit, text-based specifications. Never reference image filenames or say "match the screenshot".

Create a structured implementation prompt with these sections:

## Task
A single clear sentence describing what needs to be built or fixed.

## Requirements
A bullet list of specific requirements extracted from the ticket and comments. Include:
- Functional requirements (what it should do)
- Technical requirements (specific values, APIs, etc.)

## UI/UX Specifications
Convert ALL visual details from design analysis into concrete values:
- Layout: flexbox/grid, alignment, spacing (e.g., "gap: 8px", "padding: 16px")
- Sizing: widths, heights, max-widths (e.g., "max-width: 400px", "height: 48px")
- Typography: font sizes, weights, colors (e.g., "font-size: 14px", "color: #333")
- Colors: backgrounds, borders, text (e.g., "background: #f5f5f5", "border: 1px solid #ccc")
- Border radius, shadows, and other visual effects
- Component states: hover, focus, disabled, error styles
- Responsive breakpoints and behavior

## Technical Context
- Repository/codebase to modify (if specified)
- Relevant files or components (ONLY if mentioned - don't presume)
- Dependencies or integrations

## Acceptance Criteria
How to verify the implementation is complete.

## Additional Notes
Any other relevant context from the ticket or comments.

Be concise but complete. The coding agent must be able to implement the UI perfectly from your text description alone.`;
