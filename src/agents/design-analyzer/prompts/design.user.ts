export const buildUserPrompt = (
  frameName: string,
  context?: string
): string => `Analyze this UI design frame named "${frameName}".
${context ? `\nAdditional context: ${context}` : ''}

STEP 1: First, analyze the frame title "${frameName}" to determine the specific scope/feature being demonstrated.
- If the title indicates a specific action, state, or component (e.g., "Feed - Like Action", "Toast notification", "Error state"), focus ONLY on that specific element.
- If the title is generic (e.g., "Home", "Dashboard"), analyze the overall screen.

STEP 2: Based on the inferred scope, provide analysis ONLY for that specific feature/interaction.

Format your response as:

## Scope
- State what specific feature/interaction you're analyzing based on the frame title

## Ambiguities
- List unclear aspects of the design (only for the identified scope)

## Missing Specifications
- List details that developers would need (only for the identified scope)

## Questions for Designers
- List specific questions to ask (only for the identified scope)

## Suggestions
- List potential improvements or considerations (only for the identified scope)`;
