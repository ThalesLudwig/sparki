import * as caseManager from '../agents/case-manager/index.js';

export const runAnalysis = async (issueKey: string): Promise<void> => {
  try {
    const result = await caseManager.analyze(issueKey, { postComment: true });
    console.log(`✅ Analysis complete for ${issueKey}`);
    console.log(`   - Complete: ${result.analysis.isComplete}`);
    console.log(`   - Comment posted: ${result.commentPosted}`);
  } catch (error) {
    console.error(`❌ Analysis failed for ${issueKey}:`, error);
  }
};
