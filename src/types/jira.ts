// ============================================
// Jira Types
// ============================================

export interface JiraIssue {
  id: string;
  key: string;
  self: string;
  fields: {
    summary: string;
    description: JiraDescription | null;
    issuetype: {
      name: string;
      description?: string;
    };
    status: {
      name: string;
    };
    priority?: {
      name: string;
    };
    assignee?: {
      displayName: string;
      emailAddress: string;
    } | null;
    reporter?: {
      displayName: string;
      emailAddress: string;
    };
    labels: string[];
    components: Array<{ name: string }>;
    fixVersions: Array<{ name: string }>;
    created: string;
    updated: string;
    attachment?: Array<{
      id: string;
      filename: string;
      mimeType: string;
      content: string;
      size: number;
    }>;
    [key: string]: unknown;
  };
}

export interface JiraDescription {
  type: string;
  version: number;
  content: JiraContentNode[];
}

export interface JiraContentNode {
  type: string;
  text?: string;
  content?: JiraContentNode[];
  attrs?: Record<string, unknown>;
  marks?: Array<{ type: string; attrs?: Record<string, unknown> }>;
}

export interface JiraComment {
  id: string;
  author: {
    displayName: string;
    emailAddress: string;
  };
  body: JiraDescription;
  created: string;
  updated: string;
}
