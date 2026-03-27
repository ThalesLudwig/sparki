# SPARKi

**S**mart **P**roject **A**utomation and **R**eview **K**it for **I**mplementation

AI-powered Jira ticket automation that analyzes tickets, reviews designs, and orchestrates implementation.

## Vision

SPARKi allows anyone on your team to look at a Jira ticket and think "this is simple, have the AI do it" - all they have to do is assign the ticket to the AI agent. SPARKi will:

1. **Case Manager** - Analyze the ticket for missing information and post clarifying questions
2. **Design Analyzer** - If there are Figma links, analyze designs for ambiguities
3. **Engineering Agent** (future) - Once all information is gathered, implement the ticket

## Project Structure

```
sparki/
├── src/
│   ├── index.ts                    # Main CLI entry point
│   ├── types/                      # Shared TypeScript types
│   │   └── index.ts
│   ├── clients/                    # API clients
│   │   ├── ollama.ts               # Ollama AI client
│   │   ├── jira.ts                 # Jira API client
│   │   └── figma.ts                # Figma API client
│   └── agents/                     # AI agents
│       ├── case-manager/           # Ticket analysis agent
│       │   ├── index.ts
│       │   └── prompts.ts
│       └── design-analyzer/        # Design analysis agent
│           ├── index.ts
│           └── prompts.ts
├── reports/                        # Generated analysis reports
├── package.json
├── tsconfig.json
└── .env.example
```

## Setup

### Prerequisites

- Node.js 18+
- [Ollama](https://ollama.ai/) running locally
  - Text model (e.g., `llama3.2`) for ticket analysis
  - Vision model (e.g., `llava`) for design analysis
- Jira API token
- Figma access token (optional, for design analysis)

### Installation

```bash
npm install
```

### Configuration

```bash
cp .env.example .env
```

Edit `.env` with your credentials:

```env
# Jira
JIRA_BASE_URL=https://your-domain.atlassian.net
JIRA_EMAIL=your-email@example.com
JIRA_API_TOKEN=your_jira_api_token

# Figma (optional)
FIGMA_ACCESS_TOKEN=your_figma_token

# Ollama
OLLAMA_MODEL=llama3.2
OLLAMA_VISION_MODEL=llava
```

## Usage

### Analyze a Jira Ticket

```bash
# Basic analysis
npm start analyze PROJ-123

# Analyze and post questions as a comment
npm start analyze PROJ-123 -- --comment

# With additional context
npm start analyze PROJ-123 -- --context "React Native app"
```

### Analyze a Figma Design

```bash
# Analyze a Figma file
npm start design https://figma.com/file/ABC123/MyDesign

# Analyze specific frames
npm start design ABC123 -- --frames "1:2,1:3"

# Post questions as Figma comments
npm start design ABC123 -- --comment
```

## Agents

### Case Manager

Analyzes Jira tickets to identify missing information needed for implementation:

- Repository/codebase information
- Technical specifications (timeouts, limits, APIs)
- UI/UX details (copy, animations, accessibility)
- Business logic (edge cases, validation)
- Dependencies (external services, feature flags)
- Testing requirements (acceptance criteria)
- Design references (Figma links)

**Flow:**

1. Fetches ticket + comments from Jira
2. Analyzes with AI to find gaps
3. Posts clarifying questions as a comment (if critical issues found)
4. Re-run after answers are provided to verify completeness

### Design Analyzer

Analyzes Figma designs to identify ambiguities and missing specifications:

- Interactive element behaviors
- Animation timing and transitions
- Error/loading/empty states
- Responsive behavior
- Accessibility considerations
- Text overflow handling

## Development

```bash
# Build
npm run build

# Run in development
npm run dev
```

## License

ISC
