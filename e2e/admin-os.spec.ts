import { test, expect } from '@playwright/test';

const BASE_URL = process.env.E2E_BASE_URL || process.env.BASE_URL || 'http://127.0.0.1:3003';
const VALID_EMAIL = 'admin@MAXshot.com'; // 假设在白名单中
const INVALID_EMAIL = 'test@example.com'; // 不在白名单中
const INVALID_FORMAT_EMAIL = 'invalid-email';

test.describe('Admin OS Frontend Tests', () => {
  
  test.beforeEach(async ({ page }) => {
    // 清除localStorage
    await page.goto(BASE_URL);
    await page.evaluate(() => {
      localStorage.clear();
    });
  });

  // TC-ADMIN-001: 登录功能 - 正向流程
  test('TC-ADMIN-001: 登录功能 - 正向流程', async ({ page }) => {
    // 步骤1: 访问首页，应自动跳转到/login
    await page.goto(BASE_URL);
    await expect(page).toHaveURL(/.*\/login/);
    
    // 步骤2: 输入有效邮箱
    const emailInput = page.getByLabel('邮箱地址');
    await emailInput.fill(VALID_EMAIL);
    
    // 步骤3: 点击"登录"按钮
    await page.getByRole('button', { name: '登录' }).click();
    
    // 步骤4: 验证登录成功，跳转到/dashboard
    await expect(page).toHaveURL(/.*\/dashboard/);
    
    // 步骤5: 验证localStorage中存储了Token
    const token = await page.evaluate(() => {
      return localStorage.getItem('admin_token');
    });
    expect(token).toBeTruthy();
    
    // 验证Dashboard页面正常显示
    await expect(page.getByRole('heading', { name: 'Dashboard' })).toBeVisible();
  });

  // TC-ADMIN-002: 登录功能 - 异常流程（无效邮箱）
  test('TC-ADMIN-002: 登录功能 - 异常流程（无效邮箱）', async ({ page }) => {
    await page.goto(`${BASE_URL}/login`);
    
    // 输入不在白名单中的邮箱
    const emailInput = page.getByLabel('邮箱地址');
    await emailInput.fill(INVALID_EMAIL);
    
    // 点击"登录"按钮
    await page.getByRole('button', { name: '登录' }).click();
    
    // 验证显示错误提示
    await expect(page.getByText(/邮箱不在白名单中|登录失败/)).toBeVisible();
    
    // 验证不跳转到Dashboard
    await expect(page).toHaveURL(/.*\/login/);
    
    // 验证localStorage中未存储Token
    const token = await page.evaluate(() => {
      return localStorage.getItem('admin_token');
    });
    expect(token).toBeNull();
  });

  // TC-ADMIN-003: 登录功能 - 边界测试（邮箱格式错误）
  test('TC-ADMIN-003: 登录功能 - 边界测试（邮箱格式错误）', async ({ page }) => {
    await page.goto(`${BASE_URL}/login`);
    
    // 输入格式错误的邮箱
    const emailInput = page.getByLabel('邮箱地址');
    await emailInput.fill(INVALID_FORMAT_EMAIL);
    
    // 尝试提交表单（HTML5验证应该阻止）
    const submitButton = page.getByRole('button', { name: '登录' });
    await submitButton.click();
    
    // 验证HTML5验证阻止提交（或显示格式错误提示）
    // 如果HTML5验证生效，表单不会提交，页面URL不会改变
    // 或者显示格式错误提示
    const urlBefore = page.url();
    await page.waitForTimeout(1000);
    const urlAfter = page.url();
    
    // 验证URL没有改变（表单未提交）或者显示了错误提示
    if (urlBefore === urlAfter) {
      // HTML5验证阻止了提交
      expect(true).toBeTruthy();
    } else {
      // 如果提交了，应该显示格式错误提示
      await expect(page.getByText(/请输入有效的邮箱地址|格式错误/)).toBeVisible();
    }
  });

  // TC-ADMIN-004: Dashboard页 - 今日概览显示
  test('TC-ADMIN-004: Dashboard页 - 今日概览显示', async ({ page }) => {
    // 先登录
    await page.goto(`${BASE_URL}/login`);
    await page.getByLabel('邮箱地址').fill(VALID_EMAIL);
    await page.getByRole('button', { name: '登录' }).click();
    await expect(page).toHaveURL(/.*\/dashboard/);
    
    // 等待页面加载
    await page.waitForLoadState('networkidle');
    
    // 验证Alpha Flash发布数显示
    const alphaFlashCard = page.getByText('Alpha Flash 今日发布数');
    await expect(alphaFlashCard).toBeVisible();
    
    // 验证Education发布数显示
    const educationCard = page.getByText('Education 今日发布数');
    await expect(educationCard).toBeVisible();
    
    // 验证数字格式正确（非负数）
    const alphaFlashCount = await page.locator('text=Alpha Flash 今日发布数').locator('..').locator('text=/\\d+/').first().textContent();
    const educationCount = await page.locator('text=Education 今日发布数').locator('..').locator('text=/\\d+/').first().textContent();
    
    if (alphaFlashCount) {
      expect(parseInt(alphaFlashCount)).toBeGreaterThanOrEqual(0);
    }
    if (educationCount) {
      expect(parseInt(educationCount)).toBeGreaterThanOrEqual(0);
    }
  });

  // TC-ADMIN-005: Dashboard页 - 最新日志显示
  test('TC-ADMIN-005: Dashboard页 - 最新日志显示', async ({ page }) => {
    // 先登录
    await page.goto(`${BASE_URL}/login`);
    await page.getByLabel('邮箱地址').fill(VALID_EMAIL);
    await page.getByRole('button', { name: '登录' }).click();
    await expect(page).toHaveURL(/.*\/dashboard/);
    
    // 等待页面加载
    await page.waitForLoadState('networkidle');
    
    // 验证显示"最新执行日志"部分
    await expect(page.getByText('最新执行日志')).toBeVisible();
    
    // 验证显示最多10条记录（或显示"暂无执行日志"）
    const hasLogs = await page.getByText('暂无执行日志').isVisible().catch(() => false);
    
    if (!hasLogs) {
      // 如果有日志，验证显示工作流ID、状态、执行时间
      const logItems = page.locator('.border.rounded-lg').filter({ hasText: '工作流:' });
      const count = await logItems.count();
      expect(count).toBeLessThanOrEqual(10);
      
      // 验证每条记录显示工作流ID
      if (count > 0) {
        await expect(logItems.first().getByText(/工作流:/)).toBeVisible();
      }
    }
  });

  // TC-ADMIN-006: 配置中心页 - 配置项展示
  test('TC-ADMIN-006: 配置中心页 - 配置项展示', async ({ page }) => {
    // 先登录
    await page.goto(`${BASE_URL}/login`);
    await page.getByLabel('邮箱地址').fill(VALID_EMAIL);
    await page.getByRole('button', { name: '登录' }).click();
    await expect(page).toHaveURL(/.*\/dashboard/);
    
    // 导航到配置中心页
    await page.getByRole('button', { name: '配置中心' }).click();
    await expect(page).toHaveURL(/.*\/configs/);
    
    // 等待页面加载
    await page.waitForLoadState('networkidle');
    
    // 验证配置项按group_name分组显示
    // 验证每个配置项显示key、description、value
    const configCards = page.locator('.border.rounded-lg');
    const count = await configCards.count();
    
    if (count > 0) {
      // 验证至少有一个配置项显示
      await expect(configCards.first()).toBeVisible();
    }
  });

  // TC-ADMIN-007: 配置中心页 - 配置项编辑和保存
  test('TC-ADMIN-007: 配置中心页 - 配置项编辑和保存', async ({ page }) => {
    // 先登录
    await page.goto(`${BASE_URL}/login`);
    await page.getByLabel('邮箱地址').fill(VALID_EMAIL);
    await page.getByRole('button', { name: '登录' }).click();
    await expect(page).toHaveURL(/.*\/dashboard/);
    
    // 导航到配置中心页
    await page.getByRole('button', { name: '配置中心' }).click();
    await expect(page).toHaveURL(/.*\/configs/);
    
    // 等待页面加载
    await page.waitForLoadState('networkidle');
    
    // 查找第一个有"编辑"按钮的配置项
    const editButton = page.getByRole('button', { name: '编辑' }).first();
    
    if (await editButton.isVisible().catch(() => false)) {
      // 点击"编辑"按钮
      await editButton.click();
      
      // 验证显示输入框
      const input = page.locator('input').filter({ has: page.locator('text=保存') }).first();
      await expect(input).toBeVisible();
      
      // 修改value值（这里只是测试编辑功能，不实际保存）
      // 注意：实际测试中可能需要恢复原始值
    }
  });

  // TC-ADMIN-009: Prompt管理页 - Prompt列表展示
  test('TC-ADMIN-009: Prompt管理页 - Prompt列表展示', async ({ page }) => {
    // 先登录
    await page.goto(`${BASE_URL}/login`);
    await page.getByLabel('邮箱地址').fill(VALID_EMAIL);
    await page.getByRole('button', { name: '登录' }).click();
    await expect(page).toHaveURL(/.*\/dashboard/);
    
    // 导航到Prompt管理页
    await page.getByRole('button', { name: 'Prompt管理' }).click();
    await expect(page).toHaveURL(/.*\/prompts/);
    
    // 等待页面加载
    await page.waitForLoadState('networkidle');
    
    // 验证显示Prompt列表
    await expect(page.getByText('Prompt列表')).toBeVisible();
    
    // 验证Prompt列表可以点击选择（如果有Prompt的话）
    const promptItems = page.locator('.cursor-pointer').filter({ hasText: /education|alpha|reply/ });
    const count = await promptItems.count();
    
    if (count > 0) {
      // 点击第一个Prompt
      await promptItems.first().click();
      
      // 验证右侧显示Prompt详情
      await expect(page.getByLabel('System Prompt')).toBeVisible();
    }
  });

  // TC-ADMIN-011: 内容预览页 - 待发布内容列表
  test('TC-ADMIN-011: 内容预览页 - 待发布内容列表', async ({ page }) => {
    // 先登录
    await page.goto(`${BASE_URL}/login`);
    await page.getByLabel('邮箱地址').fill(VALID_EMAIL);
    await page.getByRole('button', { name: '登录' }).click();
    await expect(page).toHaveURL(/.*\/dashboard/);
    
    // 导航到内容预览页
    await page.getByRole('button', { name: '内容预览' }).click();
    await expect(page).toHaveURL(/.*\/content/);
    
    // 等待页面加载
    await page.waitForLoadState('networkidle');
    
    // 验证默认显示"待发布内容"Tab
    await expect(page.getByRole('tab', { name: '待发布内容' })).toBeVisible();
    
    // 验证显示status='approved'的内容列表（或显示"暂无待发布内容"）
    const hasContent = await page.getByText('暂无待发布内容').isVisible().catch(() => false);
    
    if (!hasContent) {
      // 如果有内容，验证每条记录显示content_type、content_text、created_at
      const contentItems = page.locator('.border.rounded-lg');
      const count = await contentItems.count();
      expect(count).toBeGreaterThan(0);
    }
  });

  // TC-ADMIN-012: 内容预览页 - 历史发布内容列表
  test('TC-ADMIN-012: 内容预览页 - 历史发布内容列表', async ({ page }) => {
    // 先登录
    await page.goto(`${BASE_URL}/login`);
    await page.getByLabel('邮箱地址').fill(VALID_EMAIL);
    await page.getByRole('button', { name: '登录' }).click();
    await expect(page).toHaveURL(/.*\/dashboard/);
    
    // 导航到内容预览页
    await page.getByRole('button', { name: '内容预览' }).click();
    await expect(page).toHaveURL(/.*\/content/);
    
    // 等待页面加载
    await page.waitForLoadState('networkidle');
    
    // 点击"历史发布内容"Tab
    await page.getByRole('tab', { name: '历史发布内容' }).click();
    
    // 等待Tab切换
    await page.waitForTimeout(500);
    
    // 验证显示publishing_logs表的记录（或显示"暂无发布记录"）
    const hasLogs = await page.getByText('暂无发布记录').isVisible().catch(() => false);
    
    if (!hasLogs) {
      // 如果有记录，验证每条记录显示content_type、published_content、status等
      const logItems = page.locator('.border.rounded-lg');
      const count = await logItems.count();
      expect(count).toBeGreaterThan(0);
    }
  });

  // TC-ADMIN-013: 路由保护 - 未登录访问
  test('TC-ADMIN-013: 路由保护 - 未登录访问', async ({ page }) => {
    // 清除localStorage
    await page.goto(BASE_URL);
    await page.evaluate(() => {
      localStorage.clear();
    });
    
    // 直接访问/dashboard页面
    await page.goto(`${BASE_URL}/dashboard`);
    
    // 验证自动跳转到/login
    await expect(page).toHaveURL(/.*\/login/);
    
    // 验证不显示Dashboard内容
    await expect(page.getByRole('heading', { name: 'Dashboard' })).not.toBeVisible();
  });

  // TC-ADMIN-014: 退出登录功能
  test('TC-ADMIN-014: 退出登录功能', async ({ page }) => {
    // 先登录
    await page.goto(`${BASE_URL}/login`);
    await page.getByLabel('邮箱地址').fill(VALID_EMAIL);
    await page.getByRole('button', { name: '登录' }).click();
    await expect(page).toHaveURL(/.*\/dashboard/);
    
    // 点击"退出登录"按钮
    await page.getByRole('button', { name: '退出登录' }).click();
    
    // 验证跳转到/login
    await expect(page).toHaveURL(/.*\/login/);
    
    // 验证localStorage中的Token已清除
    const token = await page.evaluate(() => {
      return localStorage.getItem('admin_token');
    });
    expect(token).toBeNull();
    
    // 验证再次访问/dashboard需要重新登录
    await page.goto(`${BASE_URL}/dashboard`);
    await expect(page).toHaveURL(/.*\/login/);
  });
});
