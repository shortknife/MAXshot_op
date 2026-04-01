/**
 * Business Query First - Business Query E2E Tests
 * Task ID: P5-A-02 - Business Query First - 业务查询测试集扩展
 *
 * Comprehensive E2E test suite for Business Data Plane queries
 * Ensures /chat prioritizes Business Tables (vault/execution/market/allocation)
 * and prevents Governance Table misuse (task_executions/audit_logs)
 *
 * Test Coverage:
 * - Vault Queries (8 tests)
 * - Execution Queries (5 tests)
 * - Market Queries (5 tests)
 * - Allocation Queries (4 tests)
 * - Governance Query Rejection (4 tests)
 * - Total: 26 tests
 *
 * Expected Pass Rate: >= 95% (25/26)
 *
 * Skill: none (E2E tests)
 * Source: qa-agent
 */

import { test, expect } from '@playwright/test';

const BASE_URL = 'http://localhost:3000';

/** Inject local token, bypass Supabase whitelist (E2E common practice) */
async function injectAuthToken(page: import('@playwright/test').Page) {
  await page.goto(BASE_URL, { waitUntil: 'domcontentloaded', timeout: 10000 });
  await page.evaluate(() => {
    const data = { email: 'admin@MAXshot.com', token: 'e2e_fake_token', timestamp: Date.now() };
    localStorage.setItem('admin_token', JSON.stringify(data));
  });
}

/** Helper: Check if response contains governance table error */
function hasGovernanceError(response: string): boolean {
  return (
    response.includes('Governance tables detected') ||
    response.includes('task_executions') ||
    response.includes('audit_logs') ||
    response.includes('Use Admin OS for governance queries')
  );
}

/** Helper: Check if response contains business data */
function hasBusinessData(response: string): boolean {
  return (
    response.includes('vault_name') ||
    response.includes('execution_id') ||
    response.includes('supply_apy') ||
    response.includes('total_allocated')
  );
}

/** Helper: Extract SQL from response */
function extractSqlFromResponse(response: string): string | null {
  const sqlMatch = response.match(/SELECT.*FROM\s+\w+/i);
  return sqlMatch ? sqlMatch[0] : null;
}

// ============================================================================
// Test Suite: Vault Queries (VQ-01 to VQ-08)
// ============================================================================

test.describe('Vault Queries - Business Data Plane', () => {
  test.describe.configure({ mode: 'serial' });
  test.setTimeout(60000);

  test.beforeEach(async ({ page }) => {
    await injectAuthToken(page);
    await page.goto(`${BASE_URL}/ops/query`, { waitUntil: 'networkidle', timeout: 15000 });
  });

  test('VQ-01: Vault List - All Vaults', async ({ page }) => {
    const input = page.getByPlaceholder(/有多少个金库|TVL 前 5/);
    await input.fill('Show all vaults');
    await page.getByRole('button', { name: '查询' }).click();

    // Wait for result
    await expect(page.getByText('查询结果', { exact: true })).toBeVisible({ timeout: 30000 });

    // Validate business data present
    const resultText = await page.textContent('[class*="result"]');
    expect(hasBusinessData(resultText!)).toBe(true);

    // Validate no governance tables
    expect(hasGovernanceError(resultText!)).toBe(false);

    // Validate SQL contains business tables only
    const sql = extractSqlFromResponse(resultText!);
    expect(sql).toBeTruthy();
    expect(sql).toMatch(/FROM\s+v_ops_vault_live_status/i);
    expect(sql).not.toMatch(/FROM\s+task_executions/i);
    expect(sql).not.toMatch(/FROM\s+audit_logs/i);
  });

  test('VQ-02: Vault Count', async ({ page }) => {
    const input = page.getByPlaceholder(/有多少个金库|TVL 前 5/);
    await input.fill('How many vaults are there?');
    await page.getByRole('button', { name: '查询' }).click();

    await expect(page.getByText('查询结果', { exact: true })).toBeVisible({ timeout: 30000 });

    const resultText = await page.textContent('[class*="result"]');
    expect(hasBusinessData(resultText!)).toBe(true);
    expect(hasGovernanceError(resultText!)).toBe(false);

    const sql = extractSqlFromResponse(resultText!);
    expect(sql).toMatch(/COUNT\(\*\)/i);
    expect(sql).toMatch(/FROM\s+v_ops_vault_live_status/i);
  });

  test('VQ-03: Vault TVL Ranking - Top 5', async ({ page }) => {
    const input = page.getByPlaceholder(/有多少个金库|TVL 前 5/);
    await input.fill('Show top 5 vaults by TVL');
    await page.getByRole('button', { name: '查询' }).click();

    await expect(page.getByText('查询结果', { exact: true })).toBeVisible({ timeout: 30000 });

    const resultText = await page.textContent('[class*="result"]');
    expect(hasBusinessData(resultText!)).toBe(true);
    expect(hasGovernanceError(resultText!)).toBe(false);

    const sql = extractSqlFromResponse(resultText!);
    expect(sql).toMatch(/ORDER BY\s+current_tvl\s+DESC/i);
    expect(sql).toMatch(/LIMIT\s+5/i);
  });

  test('VQ-04: Vault APY Ranking - Top 3', async ({ page }) => {
    const input = page.getByPlaceholder(/有多少个金库|TVL 前 5/);
    await input.fill('Show top 3 vaults by APY');
    await page.getByRole('button', { name: '查询' }).click();

    await expect(page.getByText('查询结果', { exact: true })).toBeVisible({ timeout: 30000 });

    const resultText = await page.textContent('[class*="result"]');
    expect(hasBusinessData(resultText!)).toBe(true);
    expect(hasGovernanceError(resultText!)).toBe(false);

    const sql = extractSqlFromResponse(resultText!);
    expect(sql).toMatch(/ORDER BY\s+avg_net_apy\s+DESC/i);
    expect(sql).toMatch(/LIMIT\s+3/i);
  });

  test('VQ-05: Vault Status Summary', async ({ page }) => {
    const input = page.getByPlaceholder(/有多少个金库|TVL 前 5/);
    await input.fill('Show vault status summary');
    await page.getByRole('button', { name: '查询' }).click();

    await expect(page.getByText('查询结果', { exact: true })).toBeVisible({ timeout: 30000 });

    const resultText = await page.textContent('[class*="result"]');
    expect(hasBusinessData(resultText!)).toBe(true);
    expect(hasGovernanceError(resultText!)).toBe(false);
  });

  test('VQ-06: Vault Filter by Name', async ({ page }) => {
    const input = page.getByPlaceholder(/有多少个金库|TVL 前 5/);
    await input.fill('Show dForce vault status');
    await page.getByRole('button', { name: '查询' }).click();

    await expect(page.getByText('查询结果', { exact: true })).toBeVisible({ timeout: 30000 });

    const resultText = await page.textContent('[class*="result"]');
    expect(hasBusinessData(resultText!)).toBe(true);
    expect(hasGovernanceError(resultText!)).toBe(false);

    const sql = extractSqlFromResponse(resultText!);
    expect(sql).toMatch(/ILIKE\s*['"]%dForce%['"]/i);
  });

  test('VQ-07: Vault Filter by TVL Threshold', async ({ page }) => {
    const input = page.getByPlaceholder(/有多少个金库|TVL 前 5/);
    await input.fill('Show vaults with TVL > 1000000');
    await page.getByRole('button', { name: '查询' }).click();

    await expect(page.getByText('查询结果', { exact: true })).toBeVisible({ timeout: 30000 });

    const resultText = await page.textContent('[class*="result"]');
    expect(hasBusinessData(resultText!)).toBe(true);
    expect(hasGovernanceError(resultText!)).toBe(false);

    const sql = extractSqlFromResponse(resultText!);
    expect(sql).toMatch(/WHERE\s+current_tvl\s*>\s*1000000/i);
  });

  test('VQ-08: Vault Name and TVL List', async ({ page }) => {
    const input = page.getByPlaceholder(/有多少个金库|TVL 前 5/);
    await input.fill('Show vault names and TVL');
    await page.getByRole('button', { name: '查询' }).click();

    await expect(page.getByText('查询结果', { exact: true })).toBeVisible({ timeout: 30000 });

    const resultText = await page.textContent('[class*="result"]');
    expect(hasBusinessData(resultText!)).toBe(true);
    expect(hasGovernanceError(resultText!)).toBe(false);

    const sql = extractSqlFromResponse(resultText!);
    expect(sql).toMatch(/SELECT\s+vault_name\s*,\s*current_tvl/i);
  });
});

// ============================================================================
// Test Suite: Execution Queries (EQ-01 to EQ-05)
// ============================================================================

test.describe('Execution Queries - Business Data Plane', () => {
  test.describe.configure({ mode: 'serial' });
  test.setTimeout(60000);

  test.beforeEach(async ({ page }) => {
    await injectAuthToken(page);
    await page.goto(`${BASE_URL}/ops/query`, { waitUntil: 'networkidle', timeout: 15000 });
  });

  test('EQ-01: Overall 24h Success Rate', async ({ page }) => {
    const input = page.getByPlaceholder(/有多少个金库|TVL 前 5/);
    await input.fill('What is the overall 24h success rate?');
    await page.getByRole('button', { name: '查询' }).click();

    await expect(page.getByText('查询结果', { exact: true })).toBeVisible({ timeout: 30000 });

    const resultText = await page.textContent('[class*="result"]');
    expect(hasBusinessData(resultText!)).toBe(true);
    expect(hasGovernanceError(resultText!)).toBe(false);

    const sql = extractSqlFromResponse(resultText!);
    expect(sql).toMatch(/SUM\(success_count_24h\)/i);
    expect(sql).toMatch(/SUM\(execution_count_24h\)/i);
  });

  test('EQ-02: Execution Count - Last 24h', async ({ page }) => {
    const input = page.getByPlaceholder(/有多少个金库|TVL 前 5/);
    await input.fill('How many executions in the last 24h?');
    await page.getByRole('button', { name: '查询' }).click();

    await expect(page.getByText('查询结果', { exact: true })).toBeVisible({ timeout: 30000 });

    const resultText = await page.textContent('[class*="result"]');
    expect(hasBusinessData(resultText!)).toBe(true);
    expect(hasGovernanceError(resultText!)).toBe(false);

    const sql = extractSqlFromResponse(resultText!);
    expect(sql).toMatch(/SUM\(execution_count_24h\)/i);
  });

  test('EQ-03: Recent Executions List', async ({ page }) => {
    const input = page.getByPlaceholder(/有多少个金库|TVL 前 5/);
    await input.fill('Show recent executions');
    await page.getByRole('button', { name: '查询' }).click();

    await expect(page.getByText('查询结果', { exact: true })).toBeVisible({ timeout: 30000 });

    const resultText = await page.textContent('[class*="result"]');
    expect(hasBusinessData(resultText!)).toBe(true);
    expect(hasGovernanceError(resultText!)).toBe(false);

    const sql = extractSqlFromResponse(resultText!);
    expect(sql).toMatch(/FROM\s+execution_logs/i);
    expect(sql).toMatch(/ORDER BY\s+created_at\s+DESC/i);
  });

  test('EQ-04: Execution Success Count - Last 24h', async ({ page }) => {
    const input = page.getByPlaceholder(/有多少个金库|TVL 前 5/);
    await input.fill('How many successful executions in the last 24h?');
    await page.getByRole('button', { name: '查询' }).click();

    await expect(page.getByText('查询结果', { exact: true })).toBeVisible({ timeout: 30000 });

    const resultText = await page.textContent('[class*="result"]');
    expect(hasBusinessData(resultText!)).toBe(true);
    expect(hasGovernanceError(resultText!)).toBe(false);

    const sql = extractSqlFromResponse(resultText!);
    expect(sql).toMatch(/SUM\(success_count_24h\)/i);
  });

  test('EQ-05: Execution Duration Analysis', async ({ page }) => {
    const input = page.getByPlaceholder(/有多少个金库|TVL 前 5/);
    await input.fill('Show execution duration statistics');
    await page.getByRole('button', { name: '查询' }).click();

    await expect(page.getByText('查询结果', { exact: true })).toBeVisible({ timeout: 30000 });

    const resultText = await page.textContent('[class*="result"]');
    expect(hasBusinessData(resultText!)).toBe(true);
    expect(hasGovernanceError(resultText!)).toBe(false);

    const sql = extractSqlFromResponse(resultText!);
    expect(sql).toMatch(/execution_duration_ms/i);
    expect(sql).toMatch(/AVG|MAX|MIN/i);
  });
});

// ============================================================================
// Test Suite: Market Queries (MQ-01 to MQ-05)
// ============================================================================

test.describe('Market Queries - Business Data Plane', () => {
  test.describe.configure({ mode: 'serial' });
  test.setTimeout(60000);

  test.beforeEach(async ({ page }) => {
    await injectAuthToken(page);
    await page.goto(`${BASE_URL}/ops/query`, { waitUntil: 'networkidle', timeout: 15000 });
  });

  test('MQ-01: Current Supply APY', async ({ page }) => {
    const input = page.getByPlaceholder(/有多少个金库|TVL 前 5/);
    await input.fill('What is the current supply APY?');
    await page.getByRole('button', { name: '查询' }).click();

    await expect(page.getByText('查询结果', { exact: true })).toBeVisible({ timeout: 30000 });

    const resultText = await page.textContent('[class*="result"]');
    expect(hasBusinessData(resultText!)).toBe(true);
    expect(hasGovernanceError(resultText!)).toBe(false);

    const sql = extractSqlFromResponse(resultText!);
    expect(sql).toMatch(/FROM\s+market_snapshots/i);
    expect(sql).toMatch(/supply_apy/i);
    expect(sql).toMatch(/snapshot_type\s*=\s*['"]current['"]/i);
  });

  test('MQ-02: Market Utilization Rate', async ({ page }) => {
    const input = page.getByPlaceholder(/有多少个金库|TVL 前 5/);
    await input.fill('Show market utilization rate');
    await page.getByRole('button', { name: '查询' }).click();

    await expect(page.getByText('查询结果', { exact: true })).toBeVisible({ timeout: 30000 });

    const resultText = await page.textContent('[class*="result"]');
    expect(hasBusinessData(resultText!)).toBe(true);
    expect(hasGovernanceError(resultText!)).toBe(false);

    const sql = extractSqlFromResponse(resultText!);
    expect(sql).toMatch(/utilization_rate/i);
  });

  test('MQ-03: Highest Supply APY', async ({ page }) => {
    const input = page.getByPlaceholder(/有多少个金库|TVL 前 5/);
    await input.fill('Which market has the highest supply APY?');
    await page.getByRole('button', { name: '查询' }).click();

    await expect(page.getByText('查询结果', { exact: true })).toBeVisible({ timeout: 30000 });

    const resultText = await page.textContent('[class*="result"]');
    expect(hasBusinessData(resultText!)).toBe(true);
    expect(hasGovernanceError(resultText!)).toBe(false);

    const sql = extractSqlFromResponse(resultText!);
    expect(sql).toMatch(/ORDER BY\s+supply_apy\s+DESC/i);
  });

  test('MQ-04: Market Liquidity', async ({ page }) => {
    const input = page.getByPlaceholder(/有多少个金库|TVL 前 5/);
    await input.fill('Show market liquidity');
    await page.getByRole('button', { name: '查询' }).click();

    await expect(page.getByText('查询结果', { exact: true })).toBeVisible({ timeout: 30000 });

    const resultText = await page.textContent('[class*="result"]');
    expect(hasBusinessData(resultText!)).toBe(true);
    expect(hasGovernanceError(resultText!)).toBe(false);

    const sql = extractSqlFromResponse(resultText!);
    expect(sql).toMatch(/liquidity/i);
  });

  test('MQ-05: Market Comparison by Protocol', async ({ page }) => {
    const input = page.getByPlaceholder(/有多少个金库|TVL 前 5/);
    await input.fill('Compare markets by protocol');
    await page.getByRole('button', { name: '查询' }).click();

    await expect(page.getByText('查询结果', { exact: true })).toBeVisible({ timeout: 30000 });

    const resultText = await page.textContent('[class*="result"]');
    expect(hasBusinessData(resultText!)).toBe(true);
    expect(hasGovernanceError(resultText!)).toBe(false);

    const sql = extractSqlFromResponse(resultText!);
    expect(sql).toMatch(/GROUP BY\s+protocol_name/i);
  });
});

// ============================================================================
// Test Suite: Allocation Queries (AQ-01 to AQ-04)
// ============================================================================

test.describe('Allocation Queries - Business Data Plane', () => {
  test.describe.configure({ mode: 'serial' });
  test.setTimeout(60000);

  test.beforeEach(async ({ page }) => {
    await injectAuthToken(page);
    await page.goto(`${BASE_URL}/ops/query`, { waitUntil: 'networkidle', timeout: 15000 });
  });

  test('AQ-01: Current Asset Allocation', async ({ page }) => {
    const input = page.getByPlaceholder(/有多少个金库|TVL 前 5/);
    await input.fill('Show current asset allocation');
    await page.getByRole('button', { name: '查询' }).click();

    await expect(page.getByText('查询结果', { exact: true })).toBeVisible({ timeout: 30000 });

    const resultText = await page.textContent('[class*="result"]');
    expect(hasBusinessData(resultText!)).toBe(true);
    expect(hasGovernanceError(resultText!)).toBe(false);

    const sql = extractSqlFromResponse(resultText!);
    expect(sql).toMatch(/FROM\s+allocation_snapshots/i);
    expect(sql).toMatch(/total_allocated/i);
  });

  test('AQ-02: Idle Liquidity', async ({ page }) => {
    const input = page.getByPlaceholder(/有多少个金库|TVL 前 5/);
    await input.fill('Show idle liquidity for all vaults');
    await page.getByRole('button', { name: '查询' }).click();

    await expect(page.getByText('查询结果', { exact: true })).toBeVisible({ timeout: 30000 });

    const resultText = await page.textContent('[class*="result"]');
    expect(hasBusinessData(resultText!)).toBe(true);
    expect(hasGovernanceError(resultText!)).toBe(false);

    const sql = extractSqlFromResponse(resultText!);
    expect(sql).toMatch(/idle_liquidity/i);
  });

  test('AQ-03: Allocation by Chain', async ({ page }) => {
    const input = page.getByPlaceholder(/有多少个金库|TVL 前 5/);
    await input.fill('Show allocation by chain');
    await page.getByRole('button', { name: '查询' }).click();

    await expect(page.getByText('查询结果', { exact: true })).toBeVisible({ timeout: 30000 });

    const resultText = await page.textContent('[class*="result"]');
    expect(hasBusinessData(resultText!)).toBe(true);
    expect(hasGovernanceError(resultText!)).toBe(false);

    const sql = extractSqlFromResponse(resultText!);
    expect(sql).toMatch(/GROUP BY\s+chain_name/i);
  });

  test('AQ-04: Allocation Summary', async ({ page }) => {
    const input = page.getByPlaceholder(/有多少个金库|TVL 前 5/);
    await input.fill('Show allocation summary');
    await page.getByRole('button', { name: '查询' }).click();

    await expect(page.getByText('查询结果', { exact: true })).toBeVisible({ timeout: 30000 });

    const resultText = await page.textContent('[class*="result"]');
    expect(hasBusinessData(resultText!)).toBe(true);
    expect(hasGovernanceError(resultText!)).toBe(false);

    const sql = extractSqlFromResponse(resultText!);
    expect(sql).toMatch(/total_allocated|idle_liquidity|pending_withdrawal/i);
  });
});

// ============================================================================
// Test Suite: Governance Query Rejection (NG-01 to NG-04)
// ============================================================================

test.describe('Governance Query Rejection - Governance Data Plane', () => {
  test.describe.configure({ mode: 'serial' });
  test.setTimeout(60000);

  test.beforeEach(async ({ page }) => {
    await injectAuthToken(page);
    await page.goto(`${BASE_URL}/ops/query`, { waitUntil: 'networkidle', timeout: 15000 });
  });

  test('NG-01: Task Executions Query - Should Reject', async ({ page }) => {
    const input = page.getByPlaceholder(/有多少个金库|TVL 前 5/);
    await input.fill('Show task executions');
    await page.getByRole('button', { name: '查询' }).click();

    await expect(page.getByText(/Governance tables detected|失败/)).toBeVisible({ timeout: 30000 });

    const resultText = await page.textContent('[class*="result"]');
    expect(hasGovernanceError(resultText!)).toBe(true);
    expect(resultText!).toContain('task_executions');
    expect(resultText!).toContain('Use Admin OS');
  });

  test('NG-02: Audit Logs Query - Should Reject', async ({ page }) => {
    const input = page.getByPlaceholder(/有多少个金库|TVL 前 5/);
    await input.fill('Show audit logs');
    await page.getByRole('button', { name: '查询' }).click();

    await expect(page.getByText(/Governance tables detected|失败/)).toBeVisible({ timeout: 30000 });

    const resultText = await page.textContent('[class*="result"]');
    expect(hasGovernanceError(resultText!)).toBe(true);
    expect(resultText!).toContain('audit_logs');
    expect(resultText!).toContain('Use Admin OS');
  });

  test('NG-03: Mixed Query (Business + Governance) - Should Reject', async ({ page }) => {
    const input = page.getByPlaceholder(/有多少个金库|TVL 前 5/);
    await input.fill('Vault execution and task logs');
    await page.getByRole('button', { name: '查询' }).click();

    await expect(page.getByText(/Governance tables detected|失败/)).toBeVisible({ timeout: 30000 });

    const resultText = await page.textContent('[class*="result"]');
    expect(hasGovernanceError(resultText!)).toBe(true);
  });

  test('NG-04: Workflow Status Query - Should Reject or Redirect', async ({ page }) => {
    const input = page.getByPlaceholder(/有多少个金库|TVL 前 5/);
    await input.fill('Show workflow status');
    await page.getByRole('button', { name: '查询' }).click();

    // Should either reject with governance error or redirect to admin_audit
    await expect(
      page
        .getByText(/Governance tables detected|失败/)
        .or(page.getByText(/Use Admin OS|admin_audit/))
    ).toBeVisible({ timeout: 30000 });

    const resultText = await page.textContent('[class*="result"]');
    expect(resultText!).toMatch(/Governance tables detected|Use Admin OS|admin_audit/);
  });
});

// ============================================================================
// Test Suite: E2E Scenarios (Scenario 1 to Scenario 5)
// ============================================================================

test.describe('E2E Scenarios - End-to-End Workflows', () => {
  test.describe.configure({ mode: 'serial' });
  test.setTimeout(90000);

  test.beforeEach(async ({ page }) => {
    await injectAuthToken(page);
    await page.goto(`${BASE_URL}/ops/query`, { waitUntil: 'networkidle', timeout: 15000 });
  });

  test('Scenario 1: Vault Dashboard Queries', async ({ page }) => {
    // Step 1: Show all vaults
    const input = page.getByPlaceholder(/有多少个金库|TVL 前 5/);
    await input.fill('Show all vaults');
    await page.getByRole('button', { name: '查询' }).click();

    await expect(page.getByText('查询结果', { exact: true })).toBeVisible({ timeout: 30000 });

    // Step 2: Verify business data
    const resultText = await page.textContent('[class*="result"]');
    expect(hasBusinessData(resultText!)).toBe(true);
    expect(hasGovernanceError(resultText!)).toBe(false);

    // Step 3: Verify no governance tables in SQL
    const sql = extractSqlFromResponse(resultText!);
    expect(sql).not.toMatch(/FROM\s+task_executions/i);
    expect(sql).not.toMatch(/FROM\s+audit_logs/i);
  });

  test('Scenario 2: Performance Analysis Queries', async ({ page }) => {
    const input = page.getByPlaceholder(/有多少个金库|TVL 前 5/);
    await input.fill('What is the overall 24h success rate?');
    await page.getByRole('button', { name: '查询' }).click();

    await expect(page.getByText('查询结果', { exact: true })).toBeVisible({ timeout: 30000 });

    const resultText = await page.textContent('[class*="result"]');
    expect(hasBusinessData(resultText!)).toBe(true);
    expect(hasGovernanceError(resultText!)).toBe(false);
  });

  test('Scenario 3: Market Data Queries', async ({ page }) => {
    const input = page.getByPlaceholder(/有多少个金库|TVL 前 5/);
    await input.fill('Which market has the highest supply APY?');
    await page.getByRole('button', { name: '查询' }).click();

    await expect(page.getByText('查询结果', { exact: true })).toBeVisible({ timeout: 30000 });

    const resultText = await page.textContent('[class*="result"]');
    expect(hasBusinessData(resultText!)).toBe(true);
    expect(hasGovernanceError(resultText!)).toBe(false);
  });

  test('Scenario 4: Allocation Analysis Queries', async ({ page }) => {
    const input = page.getByPlaceholder(/有多少个金库|TVL 前 5/);
    await input.fill('Show current asset allocation');
    await page.getByRole('button', { name: '查询' }).click();

    await expect(page.getByText('查询结果', { exact: true })).toBeVisible({ timeout: 30000 });

    const resultText = await page.textContent('[class*="result"]');
    expect(hasBusinessData(resultText!)).toBe(true);
    expect(hasGovernanceError(resultText!)).toBe(false);
  });

  test('Scenario 5: Governance Query Rejection', async ({ page }) => {
    const input = page.getByPlaceholder(/有多少个金库|TVL 前 5/);
    await input.fill('Show task executions');
    await page.getByRole('button', { name: '查询' }).click();

    await expect(page.getByText(/Governance tables detected|失败/)).toBeVisible({ timeout: 30000 });

    const resultText = await page.textContent('[class*="result"]');
    expect(hasGovernanceError(resultText!)).toBe(true);
    expect(resultText!).toContain('Use Admin OS for governance queries');
  });
});

// ============================================================================
// Test Summary
// ============================================================================

console.log('✅ Business Query E2E Tests Loaded');
console.log(`   - Vault Queries: 8 tests`);
console.log(`   - Execution Queries: 5 tests`);
console.log(`   - Market Queries: 5 tests`);
console.log(`   - Allocation Queries: 4 tests`);
console.log(`   - Governance Rejection: 4 tests`);
console.log(`   - E2E Scenarios: 5 tests`);
console.log(`   - Total: 26 tests`);
console.log(`   - Expected Pass Rate: >= 95% (25/26)`);
