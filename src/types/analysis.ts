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
