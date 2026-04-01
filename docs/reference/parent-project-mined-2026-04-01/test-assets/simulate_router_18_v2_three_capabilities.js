#!/usr/bin/env node
/**
 * Lily 本地模拟：Router_18_v2 ThreeCapabilities（三能分发）
 * 模拟 step0→step2_v2（Registry）→step2b/step2c→step3/step3b 分发→step4→step5 调用形态→step6
 * 用法: node simulate_router_18_v2_three_capabilities.js [--output results.json]
 */

const fs = require('fs');
const path = require('path');

const WORKFLOW_PATH = path.join(__dirname, '../../Alex_n8nExpert/4.Working/Router_WF15_Ops/Router_18_v2_ThreeCapabilities_Full.json');
const OUT_PATH = path.join(__dirname, 'router_18_v2_three_capabilities_local_results.json');

function getCode(workflow, name) {
  const node = workflow.nodes.find(n => n.name === name);
  return node?.parameters?.jsCode || null;
}

function runCode(codeStr, inputJson, refs = {}) {
  const $input = { 
    first: () => ({ json: inputJson }),
    all: () => [{ json: inputJson }]
  };
  const $ = (nodeName) => ({
    first: () => ({ json: refs[nodeName] != null ? refs[nodeName] : {} }),
    all: () => (Array.isArray(refs[nodeName]) ? refs[nodeName].map(j => ({ json: j })) : [{ json: refs[nodeName] || {} }])
  });
  try {
    const fn = new Function('$input', '$', codeStr);
    const out = fn($input, $);
    return out?.[0]?.json != null ? out[0].json : out;
  } catch (e) {
    return { _error: e.message };
  }
}

// Mock step1 (LoadExecution) & step1b (LoadTask) & step1c (LoadCapabilityRegistry)
const MOCK_EXEC = (execution_id, intent_name, entry_type = 'raw_query') => ({
  execution_id,
  task_id: 'task-' + execution_id.slice(0, 8),
  intent_name,
  entry_type,
  requester_id: 'test_user',
  status: 'executing',
  created_at: new Date().toISOString(),
});

const MOCK_TASK = (task_id, intent, slots = {}) => ({
  task_id,
  intent: intent || 'ops_query',
  payload: { intent: intent || 'ops_query', slots },
});

const MOCK_REGISTRY = [
  { capability_id: 'capability.data_fact_query', lifecycle: 'active', risk_class: 'low', webhook_url: 'https://local-mock/data_fact_query' },
  { capability_id: 'capability.product_doc_qna', lifecycle: 'active', risk_class: 'low', webhook_url: 'https://local-mock/product_doc_qna' },
  { capability_id: 'capability.content_generator', lifecycle: 'draft', risk_class: 'medium', webhook_url: 'https://local-mock/content_generator' }
];

// step0 逻辑内联
function step0_Normalize(body) {
  const raw = body;
  const b = raw.body && typeof raw.body === 'object' ? raw.body : raw;
  const execution_id = b.execution_id || raw.execution_id || '';
  if (!execution_id) throw new Error('execution_id required');
  return { execution_id };
}

// 用例定义
const CASES = [
  {
    id: 'R-O1',
    name: 'ops_query, lifecycle active → step5_data_fact_query',
    body: { execution_id: 'exec-ops-001' },
    mockExec: MOCK_EXEC('exec-ops-001', 'ops_query'),
    mockTask: MOCK_TASK('task-exec-ops', 'ops_query', { vault_name: 'USDC', metric: 'APY' }),
    expectPath: 'step0→step2→step2b(true)→step3(true)→step4→step5_data_fact_query',
    expectCapabilityId: 'capability.data_fact_query',
    expectLifecycleOk: true,
  },
  {
    id: 'R-P1',
    name: 'product_doc_qna, lifecycle active → step5_product_doc_qna',
    body: { execution_id: 'exec-p15-001' },
    mockExec: MOCK_EXEC('exec-p15-001', 'product_doc_qna'),
    mockTask: MOCK_TASK('task-exec-p15', 'product_doc_qna', { question: 'What is MaxShot?' }),
    expectPath: 'step0→step2→step2b(true)→step3(false)→step3b(false)→step4→step5_product_doc_qna',
    expectCapabilityId: 'capability.product_doc_qna',
    expectLifecycleOk: true,
  },
  {
    id: 'R-M1',
    name: 'marketing_gen, lifecycle draft → step2c Reject',
    body: { execution_id: 'exec-mkt-001' },
    mockExec: MOCK_EXEC('exec-mkt-001', 'marketing_gen'),
    mockTask: MOCK_TASK('task-exec-mkt', 'marketing_gen', { platform: 'Twitter' }),
    expectPath: 'step0→step2→step2b(false)→step2c Reject',
    expectCapabilityId: 'capability.content_generator',
    expectLifecycleOk: false,
  },
  {
    id: 'R-E1',
    name: 'missing execution_id → step0 throw',
    body: {},
    mockExec: null,
    mockTask: null,
    expectStep0Throw: true,
  },
];

function main() {
  let workflow;
  try {
    workflow = JSON.parse(fs.readFileSync(WORKFLOW_PATH, 'utf8'));
  } catch (e) {
    console.error('Workflow read fail:', e.message);
    process.exit(1);
  }

  const step2Code = getCode(workflow, 'step2_IntentToCapability_v2');
  const step2cCode = getCode(workflow, 'step2c_Reject');
  const step4Code = getCode(workflow, 'step4_ConstructCapabilityInput');

  if (!step2Code || !step2cCode || !step4Code) {
    console.error('Missing Code node(s) in workflow');
    process.exit(1);
  }

  const results = [];
  let passed = 0;

  for (const c of CASES) {
    const r = { id: c.id, name: c.name, pass: false, path: [], error: null, step2: null, step4: null };

    try {
      // step0
      if (c.expectStep0Throw) {
        try {
          step0_Normalize(c.body);
          r.error = 'expected step0 to throw';
        } catch (e) {
          r.pass = e.message === 'execution_id required';
          r.path.push('step0(throw)');
        }
        results.push(r);
        if (r.pass) passed++;
        continue;
      }
      const step0Out = step0_Normalize(c.body);
      r.path.push('step0');

      // step2: input = mock task, refs step1_LoadExecution + step1c_LoadCapabilityRegistry
      const step2Out = runCode(step2Code, c.mockTask, { 
        step1_LoadExecution: c.mockExec,
        step1c_LoadCapabilityRegistry: MOCK_REGISTRY
      });
      if (step2Out._error) {
        r.error = step2Out._error;
        results.push(r);
        continue;
      }
      r.path.push('step2');
      r.step2 = step2Out;
      
      if (step2Out.capability_id !== c.expectCapabilityId) {
        r.error = `capability_id ${step2Out.capability_id} !== expected ${c.expectCapabilityId}`;
        results.push(r);
        continue;
      }
      if (step2Out.lifecycle_ok !== c.expectLifecycleOk) {
        r.error = `lifecycle_ok ${step2Out.lifecycle_ok} !== expected ${c.expectLifecycleOk}`;
        results.push(r);
        continue;
      }

      // step2b branch: lifecycle_ok
      r.path.push(`step2b(${step2Out.lifecycle_ok})`);
      
      if (!step2Out.lifecycle_ok) {
        // step2c Reject
        const step2cOut = runCode(step2cCode, step2Out, {});
        r.path.push('step2c_Reject');
        r.pass = step2cOut?.audit?.failure_mode === 'policy_blocked' && step2cOut?.audit?.status === 'failure';
        r.step2c = step2cOut;
        results.push(r);
        if (r.pass) passed++;
        continue;
      }

      // step3 branch: capability dispatch
      const isDataFactQuery = step2Out.capability_id === 'capability.data_fact_query';
      const isProductDocQna = step2Out.capability_id === 'capability.product_doc_qna';
      const isContentGenerator = step2Out.capability_id === 'capability.content_generator';
      
      r.path.push(`step3(${isDataFactQuery})`);
      
      if (isDataFactQuery) {
        // step4 → step5_data_fact_query
        const step4Out = runCode(step4Code, step2Out, {});
        r.path.push('step4');
        r.path.push('step5_data_fact_query');
        r.step4 = step4Out;
        const cap = step4Out?.capabilityInput || step4Out;
        r.pass = cap?.execution?.execution_id === c.mockExec.execution_id && (cap?.payload?.intent || step4Out?.payload?.intent) === (c.mockTask.intent || c.mockTask.payload?.intent);
        results.push(r);
        if (r.pass) passed++;
        continue;
      }
      
      r.path.push(`step3b(${isContentGenerator})`);
      
      if (isProductDocQna) {
        // step4 → step5_product_doc_qna
        const step4Out = runCode(step4Code, step2Out, {});
        r.path.push('step4');
        r.path.push('step5_product_doc_qna');
        r.step4 = step4Out;
        const cap = step4Out?.capabilityInput || step4Out;
        r.pass = cap?.execution?.execution_id === c.mockExec.execution_id && (cap?.payload?.intent || step4Out?.payload?.intent) === (c.mockTask.intent || c.mockTask.payload?.intent);
        results.push(r);
        if (r.pass) passed++;
        continue;
      }
      
      if (isContentGenerator) {
        // step4 → step5_content_generator
        const step4Out = runCode(step4Code, step2Out, {});
        r.path.push('step4');
        r.path.push('step5_content_generator');
        r.step4 = step4Out;
        const cap = step4Out?.capabilityInput || step4Out;
        r.pass = (cap?.execution?.execution_id || step4Out?.execution?.execution_id) === c.mockExec.execution_id;
        results.push(r);
        if (r.pass) passed++;
        continue;
      }

      r.error = 'No capability branch matched';
      results.push(r);
    } catch (e) {
      r.error = e.message;
      results.push(r);
    }
  }

  const summary = { total: CASES.length, passed, failed: CASES.length - passed };
  const out = { run_at: new Date().toISOString(), summary, results };
  
  const writeOut = process.argv.includes('--output');
  if (writeOut) {
    const outPath = process.argv[process.argv.indexOf('--output') + 1] || OUT_PATH;
    fs.writeFileSync(outPath, JSON.stringify(out, null, 2));
    console.log('Written:', outPath);
  }
  
  console.log('Router_18_v2 ThreeCapabilities local sim:', summary.passed + '/' + summary.total);
  results.forEach((r) => console.log(r.id, r.pass ? 'PASS' : 'FAIL', r.path?.join('→') || '', r.error || ''));
  process.exit(summary.passed === summary.total ? 0 : 1);
}

main();
