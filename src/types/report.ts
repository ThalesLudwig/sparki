// ============================================
// Report Types
// ============================================

import type { TicketAnalysisResult, DesignAnalysisResult } from './analysis.js';

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
