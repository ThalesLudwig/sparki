#!/usr/bin/env node
import { config } from 'dotenv';
config();

import { printHelp } from './utils/help.js';
import { runAnalyze } from './commands/analyze.js';
import { runDesign } from './commands/design.js';

const main = async () => {
  const args = process.argv.slice(2);

  if (args.length === 0 || args[0] === '--help' || args[0] === '-h') {
    printHelp();
    process.exit(0);
  }

  const command = args[0];
  const commandArgs = args.slice(1);

  console.log('⚡ SPARKi - AI Ticket Automation');
  console.log('================================\n');

  try {
    switch (command) {
      case 'analyze':
        await runAnalyze(commandArgs);
        break;
      case 'design':
        await runDesign(commandArgs);
        break;
      default:
        console.error(`❌ Unknown command: ${command}`);
        printHelp();
        process.exit(1);
    }
  } catch (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  }
};

main();
