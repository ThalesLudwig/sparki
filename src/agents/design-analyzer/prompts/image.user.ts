export const buildImagePrompt = (
  imageName: string,
  ticketContext?: string
): string => `Analyze this UI screenshot/mockup named "${imageName}".

${ticketContext ? `Ticket context: ${ticketContext}` : ''}

Extract ALL implementation details from this image. Be thorough and specific.

Format your response as:

## Description
A brief overall description of what this screen/component shows.

## UI Elements
List ALL visible UI elements with their details:
- Type (button, input, label, icon, etc.)
- Text content (exact text if visible)
- Position/location in the layout
- Apparent styling (colors, size estimates)

## Specifications
Any specific values you can extract or estimate:
- Dimensions, spacing, margins
- Colors (describe or estimate hex values)
- Font sizes (estimate: small, medium, large, or px)
- Border radius, shadows

## Interactions
What interactions are implied:
- Clickable elements
- Input fields and their expected behavior
- Navigation flows
- Form submissions

## Additional Notes
Any other relevant details for implementation.`;
