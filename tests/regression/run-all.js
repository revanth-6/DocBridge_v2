const securityTest = require('./security.test.js');
const stabilityTest = require('./stability.test.js');
const integrityTest = require('./integrity.test.js');
const crudTest = require('./crud.test.js');

const { execSync } = require('child_process');

async function runAll() {
  console.log('--- SETTING UP TESTING ENVIRONMENT ---');
  try {
    execSync('npx pm2 restart docbridge-gateway --update-env', { 
      env: { ...process.env, NODE_ENV: 'test' } 
    });
    console.log('docbridge-gateway restarted in test mode.');
    await new Promise(r => setTimeout(r, 2500));
  } catch (err) {
    console.error('Failed to restart gateway in test mode:', err.message);
  }

  console.log('--- RUNNING DOCBRIDGE REGRESSION SUITE ---');
  
  const suites = [
    securityTest,
    stabilityTest,
    integrityTest,
    crudTest
  ];

  const results = [];
  let allPassed = true;
  let totalTests = 0;
  let totalPassed = 0;

  for (const suite of suites) {
    const res = await suite();
    results.push(res);
    totalTests += res.total;
    totalPassed += res.passed;
    if (res.passed !== res.total) allPassed = false;
    
    // Wait 1.5 seconds to ensure JWT 'iat' changes for next login to avoid unique constraints
    await new Promise(r => setTimeout(r, 1500));
  }

  // Print results
  console.log('\nFailed Tests Detail:');
  for (const res of results) {
    for (const t of res.results) {
      if (!t.passed) {
        console.log(`❌ [${res.name}] ${t.name} -> ${t.reason}`);
      }
    }
  }

  console.log('\n╔══════════════════════════════════╦════════╦═════════╗');
  console.log('║ Test Suite                       ║ Tests  ║ Result  ║');
  console.log('╠══════════════════════════════════╬════════╬═════════╣');
  
  for (const res of results) {
    const namePad = res.name.padEnd(32, ' ');
    const testPad = `${res.passed}/${res.total}`.padEnd(6, ' ');
    const resultPad = res.passed === res.total ? '✅ PASS ' : '❌ FAIL ';
    console.log(`║ ${namePad} ║ ${testPad} ║ ${resultPad}║`);
  }

  console.log('╠══════════════════════════════════╬════════╬═════════╣');
  const totalNamePad = 'TOTAL'.padEnd(32, ' ');
  const totalTestPad = `${totalPassed}/${totalTests}`.padEnd(6, ' ');
  const totalResultPad = allPassed ? '✅ PASS ' : '❌ FAIL ';
  console.log(`║ ${totalNamePad} ║ ${totalTestPad} ║ ${totalResultPad}║`);
  console.log('╚══════════════════════════════════╩════════╩═════════╝');

  console.log('\n--- RESTORING PRODUCTION ENVIRONMENT ---');
  try {
    execSync('npx pm2 restart docbridge-gateway --update-env', { 
      env: { ...process.env, NODE_ENV: 'production' } 
    });
    console.log('docbridge-gateway restored to production mode.');
    await new Promise(r => setTimeout(r, 2000));
  } catch (err) {
    console.error('Failed to restore gateway to production mode:', err.message);
  }

  if (!allPassed) {
    process.exit(1);
  } else {
    process.exit(0);
  }
}

runAll();
