import * as designAnalyzer from '../agents/design-analyzer/index.js';
import * as ollama from '../clients/ollama.js';
import * as figma from '../clients/figma.js';
import { saveReport } from '../utils/report.js';

export const runDesign = async (args: string[]) => {
  if (args.length === 0) {
    console.error('❌ Missing Figma URL. Usage: sparki design <figma-url>');
    process.exit(1);
  }

  const figmaUrl = args[0];
  let frameIds: string[] | undefined;
  let context: string | undefined;
  let maxFrames = 10;
  let model: string | undefined;
  let postComments = false;

  for (let i = 1; i < args.length; i++) {
    switch (args[i]) {
      case '--frames':
        frameIds = args[++i]?.split(',').map((id) => id.trim().replace('-', ':'));
        break;
      case '--context':
        context = args[++i];
        break;
      case '--max':
        maxFrames = parseInt(args[++i], 10);
        break;
      case '--model':
        model = args[++i];
        break;
      case '--comment':
        postComments = true;
        break;
    }
  }

  console.log('🔌 Checking connections...');
  const ollamaOk = await ollama.checkConnection(model);
  if (!ollamaOk) {
    console.error('❌ Failed to connect to Ollama');
    process.exit(1);
  }
  console.log('✅ Ollama connected');

  const figmaOk = await figma.checkConnection();
  if (!figmaOk) {
    console.error('❌ Failed to connect to Figma');
    process.exit(1);
  }
  console.log('✅ Figma connected');

  const { fileKey } = figma.extractFigmaInfo(figmaUrl);
  const report = await designAnalyzer.analyze(figmaUrl, {
    frameIds,
    context,
    maxFrames,
    model,
    postComments,
  });
  console.log('\n' + '='.repeat(60));
  console.log(designAnalyzer.formatReport(report));
  await saveReport('design-analysis', fileKey, report);
};
