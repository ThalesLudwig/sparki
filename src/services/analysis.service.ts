import * as caseManager from '../agents/case-manager/index.js';

export const runAnalysis = async (issueKey: string): Promise<void> => {
  try {
    const report = await caseManager.analyze(issueKey, { postComment: true });
    console.log(`✅ Analysis complete for ${issueKey}`);
    console.log(`   - Complete: ${report.analysis.isComplete}`);
    console.log(`   - Comment posted: ${report.commentPosted}`);
  } catch (error) {
    console.error(`❌ Analysis failed for ${issueKey}:`, error);
  }
};
