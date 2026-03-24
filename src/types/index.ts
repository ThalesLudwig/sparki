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
      filename: string;
      mimeType: string;
      content: string;
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

// ============================================
// Figma Types
// ============================================

export interface FigmaNode {
  id: string;
  name: string;
  type: string;
  children?: FigmaNode[];
  absoluteBoundingBox?: {
    x: number;
    y: number;
    width: number;
    height: number;
  };
  fills?: unknown[];
  strokes?: unknown[];
  effects?: unknown[];
  characters?: string;
  style?: unknown;
}

export interface FigmaFile {
  name: string;
  lastModified: string;
  document: FigmaNode;
  components: Record<string, unknown>;
  styles: Record<string, unknown>;
}

export interface FigmaImageResponse {
  images: Record<string, string>;
  err: string | null;
}

export interface FigmaComment {
  id: string;
  message: string;
  file_key: string;
  parent_id?: string;
  user: {
    id: string;
    handle: string;
    img_url: string;
  };
  created_at: string;
  resolved_at?: string;
  client_meta?: {
    node_id?: string;
    node_offset?: { x: number; y: number };
  };
}

// ============================================
// Analysis Types
// ============================================

export interface MissingInfo {
  category: string;
  description: string;
  importance: 'critical' | 'high' | 'medium' | 'low';
}

export interface TicketAnalysisResult {
  issueKey: string;
  summary: string;
  isComplete: boolean;
  missingInformation: MissingInfo[];
  questions: string[];
  recommendations: string[];
  rawAnalysis: string;
}

export interface DesignAnalysisResult {
  frameName: string;
  frameId: string;
  scope: string[];
  ambiguities: string[];
  missingSpecs: string[];
  questions: string[];
  suggestions: string[];
  rawAnalysis: string;
}

// ============================================
// Report Types
// ============================================

export interface TicketAnalysisReport {
  issueKey: string;
  summary: string;
  issueType: string;
  status: string;
  analyzedAt: string;
  analysis: TicketAnalysisResult;
  designAnalysis?: DesignAnalysisReport;
  commentPosted: boolean;
  commentId?: string;
}

export interface DesignAnalysisReport {
  fileKey: string;
  fileName: string;
  analyzedAt: string;
  totalFramesFound: number;
  totalFramesAnalyzed: number;
  analyses: DesignAnalysisResult[];
  summary: {
    totalAmbiguities: number;
    totalMissingSpecs: number;
    totalQuestions: number;
    totalSuggestions: number;
  };
}
