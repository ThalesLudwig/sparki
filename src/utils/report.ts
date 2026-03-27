import * as fs from 'fs/promises';

export const saveReport = async (name: string, key: string, report: object) => {
  const reportsDir = 'reports';
  await fs.mkdir(reportsDir, { recursive: true });
  const fileName = `${reportsDir}/${name}-${key}-${Date.now()}.json`;
  await fs.writeFile(fileName, JSON.stringify(report, null, 2));
  console.log(`\n📁 Report saved to: ${fileName}`);
};
