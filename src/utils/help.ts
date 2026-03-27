const helpText = `
SPARKi - AI-powered Jira Ticket Automation

Usage:
  sparki <command> [options]

Commands:
  analyze <issue-key>     Analyze a Jira ticket for missing information
  design <figma-url>      Analyze a Figma design for ambiguities

Options for 'analyze':
  --context <text>        Additional context about the project
  --model <name>          Ollama model to use (default: llama3.2)
  --comment               Post questions as a comment in Jira

Options for 'design':
  --frames <id1,id2>      Analyze specific frame IDs only
  --context <text>        Additional context about the design
  --max <number>          Maximum frames to analyze (default: 10)
  --model <name>          Ollama vision model (default: llava)
  --comment               Post questions as comments in Figma

Examples:
  sparki analyze PROJ-123
  sparki analyze PROJ-123 --comment
  sparki design https://figma.com/file/ABC123/MyDesign
  sparki design ABC123 --frames "1:2,1:3" --max 5

Environment Variables:
  JIRA_BASE_URL           Jira instance URL
  JIRA_EMAIL              Jira account email
  JIRA_API_TOKEN          Jira API token
  FIGMA_ACCESS_TOKEN      Figma personal access token
  OLLAMA_MODEL            Default text model (default: llama3.2)
  OLLAMA_VISION_MODEL     Default vision model (default: llava)
`;

export const printHelp = () => {
  console.log(helpText);
};
