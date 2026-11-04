// Run this function with playwright-cli run-code. It mocks API responses;
// no real credentials are saved and no model requests leave the browser.
async page => {
  const ids = ['MELCHIOR', 'BALTHASAR', 'CASPER'];
  const config = Object.fromEntries(ids.map(id => [id, { baseUrl: 'https://example.invalid/v1', model: 'test-model', hasKey: false }]));
  let runRequests = 0, configurationRequests = 0, saved = false;
  const configHandler = async route => {
    configurationRequests++;
    if (route.request().method() === 'POST') {
      const input = route.request().postDataJSON();
      for (const id of ids) {
        if (input[id].key !== 'demo-test-only') throw new Error('Connection copy failed');
        config[id].hasKey = true;
      }
      saved = true;
      return route.fulfill({ json: { ok: true } });
    }
    return route.fulfill({ json: config });
  };
  const runHandler = async route => {
    runRequests++;
    await route.fulfill({ status: 503, json: { error: '模拟连接失败（回归测试）' } });
  };
  const assert = (condition, message) => { if (!condition) throw new Error(message); };
  await page.route('**/api/config', configHandler);
  await page.route('**/api/run', runHandler);
  try {
    await page.reload();
    await page.getByRole('button', { name: '提訴：输入提案', exact: true }).click();
    const proposal = page.getByRole('textbox', { name: '写成一个可以赞成或反对的明确提案。', exact: true });
    await proposal.fill('');
    await page.getByRole('button', { name: '确认提案并启动', exact: true }).click();
    assert((await page.getByRole('alert').textContent()).includes('请先填写'), 'Empty input feedback missing');
    assert(configurationRequests === 0, 'Empty proposal triggered a configuration request');
    await proposal.fill('先验证首次使用流程，再发布。');
    await page.getByRole('button', { name: '确认提案并启动', exact: true }).click();
    await page.getByRole('button', { name: '去配置模型', exact: true }).waitFor();
    assert((await page.getByRole('alert').textContent()).includes('API Key'), 'Missing Key feedback missing');
    assert(runRequests === 0, 'Run was requested without credentials');
    assert(await proposal.inputValue() === '先验证首次使用流程，再发布。', 'Proposal was lost');
    await page.getByRole('button', { name: '去配置模型', exact: true }).click();
    await page.getByRole('group', { name: 'MELCHIOR / 科学家', exact: true }).getByLabel('API Key · 未配置', { exact: true }).fill('demo-test-only');
    await page.getByRole('button', { name: '将第一组配置复制到三个单元', exact: true }).click();
    for (const [id, title] of [['BALTHASAR', '守护者'], ['CASPER', '自我']]) {
      assert(await page.getByRole('group', { name: `${id} / ${title}`, exact: true }).getByLabel('API Key · 未配置', { exact: true }).inputValue() === 'demo-test-only', 'Key was not copied');
    }
    await page.getByRole('button', { name: '保存配置', exact: true }).click();
    await page.getByRole('heading', { name: '提交表决提案', exact: true }).waitFor();
    assert(saved, 'Configuration was not saved');
    assert(await proposal.inputValue() === '先验证首次使用流程，再发布。', 'Return from configuration lost the proposal');
    await page.getByRole('button', { name: '确认提案并启动', exact: true }).click();
    await page.getByRole('alert').filter({ hasText: '模拟连接失败' }).waitFor();
    assert(runRequests === 1, 'Unexpected number of run requests');
    assert(await proposal.isVisible(), 'Run failure did not reopen proposal dialog');
    config.CASPER.hasKey = false;
    await page.getByRole('button', { name: '确认提案并启动', exact: true }).click();
    await page.getByRole('button', { name: '去配置模型', exact: true }).waitFor();
    assert((await page.getByRole('alert').textContent()).includes('CASPER'), 'Partial configuration was not detected');
    await page.getByRole('button', { name: '先体验演示回放', exact: true }).click();
    await page.getByText('承認', { exact: true }).waitFor();
    assert(runRequests === 1, 'Replay sent a live model request');
    return 'PASS: empty input, missing/partial configuration, connection copy, return to proposal, visible server error, and no-Key replay';
  } finally {
    await page.unroute('**/api/config', configHandler);
    await page.unroute('**/api/run', runHandler);
    await page.reload();
  }
}
