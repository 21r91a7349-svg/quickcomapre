/**
 * QuickCompare Sprint 6 — Regression Test Suite
 * 
 * Tests validate BEHAVIOR, not absolute catalog counts.
 * All assertions are deterministic regardless of live retailer inventory.
 */
import { scraperOrchestrator } from '../src/scraper';

let passed = 0;
let failed = 0;

function assert(condition: boolean, testName: string, details?: string) {
  if (condition) {
    console.log(`  ✅ PASS: ${testName}`);
    passed++;
  } else {
    console.log(`  ❌ FAIL: ${testName}${details ? ` — ${details}` : ''}`);
    failed++;
  }
}

async function test1_platformStatusKeysPresent() {
  console.log('\n--- Test 1: Platform status keys present for all registered adapters ---');
  const response = await scraperOrchestrator.getSearchResults('milk');
  const ps = response.platformStatus;
  
  assert(ps !== undefined && ps !== null, 'platformStatus exists in response');
  assert('Blinkit' in ps, 'Blinkit key exists in platformStatus');
  assert('BigBasket' in ps, 'BigBasket key exists in platformStatus');
  assert('Zepto' in ps, 'Zepto key exists in platformStatus');
  
  // Every status must have a valid status code
  const validCodes = ['SUCCESS', 'ZERO_RESULTS', 'TIMEOUT', 'PARSER_FAILED', 'NETWORK_FAILED', 'BLOCKED_BY_ANTI_BOT', 'DISABLED', 'NOT_IMPLEMENTED', 'SKIPPED_CACHE_FRESH'];
  for (const [name, entry] of Object.entries(ps as Record<string, any>)) {
    assert(validCodes.includes(entry.status), `${name} has valid status code: ${entry.status}`);
  }
}

async function test2_noFalseSuccessOnFreshCache() {
  console.log('\n--- Test 2: Fresh cache must report SKIPPED_CACHE_FRESH, never SUCCESS ---');
  
  // First call populates cache
  await scraperOrchestrator.getSearchResults('coke');
  
  // Second call should hit fresh cache
  const response2 = await scraperOrchestrator.getSearchResults('coke');
  const trace = response2.trace;
  
  if (trace?.cache?.status === 'FRESH_HIT') {
    const ps = response2.platformStatus;
    for (const [name, entry] of Object.entries(ps as Record<string, any>)) {
      assert(
        entry.status !== 'SUCCESS',
        `${name} does not falsely report SUCCESS on fresh cache (actual: ${entry.status})`
      );
    }
  } else {
    console.log('  ⚠️  SKIP: Cache was not fresh on second call (might be DB-degraded mode)');
  }
}

async function test3_adapterResultsMatchStatus() {
  console.log('\n--- Test 3: IF adapter returns products THEN status must be SUCCESS ---');
  const response = await scraperOrchestrator.getSearchResults('lays');
  const trace = response.trace;
  
  if (trace?.scraper?.adapterResults) {
    for (const [slug, result] of Object.entries(trace.scraper.adapterResults as Record<string, any>)) {
      if (result.productsScraped > 0) {
        assert(result.status === 'SUCCESS', `${slug}: scraped ${result.productsScraped} products → status is SUCCESS`);
      }
      if (result.status === 'SUCCESS') {
        assert(result.productsScraped > 0, `${slug}: status SUCCESS → productsScraped > 0`);
      }
    }
  }
}

async function test4_traceVersionPresent() {
  console.log('\n--- Test 4: SearchTrace has version field ---');
  const response = await scraperOrchestrator.getSearchResults('atta');
  const trace = response.trace;
  
  assert(trace?.traceVersion !== undefined, 'traceVersion is present');
  assert(trace?.traceVersion >= 2, `traceVersion >= 2 (actual: ${trace?.traceVersion})`);
}

async function test5_timingFieldsPopulated() {
  console.log('\n--- Test 5: Timing fields are populated ---');
  const response = await scraperOrchestrator.getSearchResults('orange juice');
  const t = response.trace?.timing;
  
  assert(t !== undefined, 'timing object exists');
  assert(typeof t?.totalLatencyMs === 'number', 'totalLatencyMs is a number');
  assert(t?.totalLatencyMs > 0, `totalLatencyMs > 0 (actual: ${t?.totalLatencyMs}ms)`);
}

async function test6_noAdapterSilentlyDisappears() {
  console.log('\n--- Test 6: No enabled adapter silently disappears from platformStatus ---');
  const response = await scraperOrchestrator.getSearchResults('onion');
  const ps = response.platformStatus;
  const trace = response.trace;
  
  // If adapters were executed (not fresh cache), every enabled adapter must appear
  if (trace?.scraper?.status === 'EXECUTED') {
    assert('Blinkit' in (ps || {}), 'Blinkit present in platformStatus after execution');
    assert('BigBasket' in (ps || {}), 'BigBasket present in platformStatus after execution');
    assert('Zepto' in (ps || {}), 'Zepto present in platformStatus after execution');
  }
}

async function runAllTests() {
  console.log('===========================================================');
  console.log(' QUICKCOMPARE SPRINT 6 — REGRESSION TEST SUITE');
  console.log('===========================================================');

  await test1_platformStatusKeysPresent();
  await test2_noFalseSuccessOnFreshCache();
  await test3_adapterResultsMatchStatus();
  await test4_traceVersionPresent();
  await test5_timingFieldsPopulated();
  await test6_noAdapterSilentlyDisappears();

  console.log('\n===========================================================');
  console.log(` RESULTS: ${passed} passed, ${failed} failed, ${passed + failed} total`);
  console.log('===========================================================');
  
  if (failed > 0) {
    process.exit(1);
  }
}

runAllTests().catch(err => {
  console.error('Regression suite crashed:', err);
  process.exit(1);
});
