// Read-only acceptance summary: historical evidence is not new native acceptance.
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
const report = JSON.parse(readFileSync(new URL('../docs/validation-0.3.3.json', import.meta.url), 'utf8'));
assert.equal(report.version, '0.3.3');
assert.equal(typeof report.visual.humanAccepted, 'boolean');
assert.equal(typeof report.productionBuild.installerExecuted, 'boolean');
assert.equal(typeof report.physicalInput.retested, 'boolean');
assert.ok(Array.isArray(report.notTested));
console.log(JSON.stringify({ version: report.version, stage: 'private refinement preview',
  historicalHumanAccepted: report.visual.humanAccepted,
  historicalInstallerExecuted: report.productionBuild.installerExecuted,
  historicalPhysicalInputRetested: report.physicalInput.retested,
  remainingAcceptanceCategories: report.notTested.length, nativeRetestedThisRun: false }));
