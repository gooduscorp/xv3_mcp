'use strict';

const { describe, it, beforeEach, afterEach } = require('node:test');
const assert = require('node:assert/strict');

const getTools = require('../tools/get');
const setTools = require('../tools/set');
const perfTools = require('../tools/perf');
const issueTools = require('../tools/issue');

function mockJson(data) {
  return {
    status: 200,
    ok: true,
    headers: { get: () => null },
    text: async () => JSON.stringify({ status: 2000, message: 'OK', data }),
  };
}

describe('MCP tools (REST API integration)', () => {
  const originalFetch = global.fetch;
  const savedEnv = {};

  beforeEach(() => {
    savedEnv.NMS_API_BASE_URL = process.env.NMS_API_BASE_URL;
    savedEnv.NMS_API_KEY = process.env.NMS_API_KEY;
    process.env.NMS_API_BASE_URL = 'https://nms.example.local';
    process.env.NMS_API_KEY = 'test-key-999999';
  });

  afterEach(() => {
    global.fetch = originalFetch;
    for (const [k, v] of Object.entries(savedEnv)) {
      if (v === undefined) delete process.env[k];
      else process.env[k] = v;
    }
  });

  it('get.listDeviceInterfaceSummary aggregates devices and interfaces', async () => {
    global.fetch = async (url) => {
      if (url.includes('/xv3/api/device-all-list')) {
        return mockJson([
          { id: 1, siteId: 10, siteName: 'HQ', name: 'Core-SW', ip: '10.0.0.1', vendor: 'Cisco', model: 'C9300', deviceTypeId: 1, deviceTypeName: 'Switch' },
        ]);
      }
      if (url.includes('/xv3/api/device-interface')) {
        return mockJson([
          { id: 101, interfaceId: 1, name: 'Gi1/0/1', description: 'Uplink', alias: 'WAN', adminStatus: 1, operStatus: 1, lastUsedDate: '2026-06-25 10:00:00' },
          { id: 102, interfaceId: 2, name: 'Gi1/0/2', description: '', alias: '', adminStatus: 2, operStatus: 2, lastUsedDate: '2026-06-24 10:00:00' },
        ]);
      }
      throw new Error(`Unexpected URL: ${url}`);
    };

    const res = await getTools.listDeviceInterfaceSummary({ site_id: 10 });
    assert.equal(res.length, 1);
    assert.deepEqual(res[0], {
      device_id: 1,
      site_id: 10,
      site_name: 'HQ',
      device_name: 'Core-SW',
      device_ip: '10.0.0.1',
      vendor: 'Cisco',
      model: 'C9300',
      device_type: 'Switch',
      interface_total: 2,
      admin_up: 1,
      admin_down: 1,
      oper_up: 1,
      oper_down: 1,
      description_count: 1,
      alias_count: 1,
      interface_last_modified: '2026-06-25 10:00:00',
    });
  });

  it('set.updateDeviceDescription uses GET-then-PUT with DeviceInfoRequestDto', async () => {
    const calls = [];
    global.fetch = async (url, opts) => {
      calls.push({ method: opts.method, url, body: opts.body ? JSON.parse(opts.body) : null });
      if (opts.method === 'GET') {
        return mockJson({ id: 5, siteId: 1, name: 'SW-01', ip: '10.0.0.5', description: 'old' });
      }
      if (opts.method === 'PUT') {
        return mockJson(true);
      }
      throw new Error(`Unexpected call: ${opts.method} ${url}`);
    };

    const res = await setTools.updateDeviceDescription({ device_id: 5, description: 'new-desc' });
    assert.equal(res.success, true);
    assert.equal(res.description, 'new-desc');
    assert.equal(calls.length, 2);
    assert.equal(calls[0].method, 'GET');
    assert.equal(calls[1].method, 'PUT');
    assert.equal(calls[1].body.description, 'new-desc');
  });

  it('perf.getPerfDevice routes raw POST and daily GET correctly', async () => {
    const calls = [];
    global.fetch = async (url, opts) => {
      calls.push({ method: opts.method, url, body: opts.body ? JSON.parse(opts.body) : null });
      return mockJson([{ value: 42 }]);
    };

    await perfTools.getPerfDevice({ device_id: 1, collect_item_id: 1, granularity: 'hourly', limit: 10 });
    await perfTools.getPerfDevice({ device_id: 1, collect_item_id: 1, granularity: 'daily', limit: 10 });

    assert.equal(calls[0].method, 'POST');
    assert.match(calls[0].url, /\/xv3\/api\/perf-raw$/);
    assert.equal(calls[0].body.collect_type, 'H');

    assert.equal(calls[1].method, 'GET');
    assert.match(calls[1].url, /\/xv3\/api\/perf-daily\?/);
    assert.match(calls[1].url, /collectType=D/);
  });

  it('issue.getEventSummary aggregates issue-history by type and severity', async () => {
    global.fetch = async () =>
      mockJson({
        content: [
          { issueType: 'P', issueTypeName: 'Ping', severity: 1, severityName: 'Critical' },
          { issueType: 'P', issueTypeName: 'Ping', severity: 1, severityName: 'Critical' },
          { issueType: 'S', issueTypeName: 'Syslog', severity: 4, severityName: 'Warning' },
        ],
      });

    const summary = await issueTools.getEventSummary({ site_id: 1 });
    assert.equal(summary.total, 3);
    assert.deepEqual(summary.by_type, [
      { issue_type: 'P', issue_name: 'Ping', count: 2 },
      { issue_type: 'S', issue_name: 'Syslog', count: 1 },
    ]);
    assert.deepEqual(summary.by_severity, [
      { severity: 1, severity_name: 'Critical', count: 2 },
      { severity: 4, severity_name: 'Warning', count: 1 },
    ]);
  });

  it('throws clear errors for unsupported backend endpoints', async () => {
    await assert.rejects(() => setTools.closeIssue(), /close_issue/);
    await assert.rejects(() => setTools.createTopologyLink(), /create_topology_link/);
    await assert.rejects(() => setTools.deleteTopologyLink(), /delete_topology_link/);
    await assert.rejects(() => perfTools.getPerfTopN(), /get_perf_topn/);
  });
});
