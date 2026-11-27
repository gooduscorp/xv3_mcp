'use strict';

const { describe, it, beforeEach, afterEach } = require('node:test');
const assert = require('node:assert/strict');
const api = require('../api');

function mockResponse({ status = 200, ok = status >= 200 && status < 300, body = '', headers = {} } = {}) {
  const text = typeof body === 'string' ? body : JSON.stringify(body);
  return {
    status,
    ok,
    headers: {
      get: (name) => headers[name.toLowerCase()] ?? null,
    },
    text: async () => text,
  };
}

describe('api.js', () => {
  const originalFetch = global.fetch;
  const savedEnv = {};

  beforeEach(() => {
    savedEnv.NMS_API_BASE_URL = process.env.NMS_API_BASE_URL;
    savedEnv.NMS_API_KEY = process.env.NMS_API_KEY;
    savedEnv.NMS_API_TIMEOUT_MS = process.env.NMS_API_TIMEOUT_MS;

    process.env.NMS_API_BASE_URL = 'https://nms.example.local:8443/';
    process.env.NMS_API_KEY = 'secret-access-key-123456';
    process.env.NMS_API_TIMEOUT_MS = '5000';
  });

  afterEach(() => {
    global.fetch = originalFetch;
    for (const [k, v] of Object.entries(savedEnv)) {
      if (v === undefined) delete process.env[k];
      else process.env[k] = v;
    }
  });

  it('validates required env vars and strips trailing slash', () => {
    const cfg = api.getConfig();
    assert.equal(cfg.baseUrl, 'https://nms.example.local:8443');
    assert.equal(cfg.apiKey, 'secret-access-key-123456');
    assert.equal(cfg.timeoutMs, 5000);

    delete process.env.NMS_API_BASE_URL;
    assert.throws(() => api.getConfig(), /NMS_API_BASE_URL/);

    process.env.NMS_API_BASE_URL = 'ftp://invalid';
    assert.throws(() => api.getConfig(), /http:\/\/ 또는 https:\/\//);

    process.env.NMS_API_BASE_URL = 'https://nms.example.local';
    delete process.env.NMS_API_KEY;
    assert.throws(() => api.getConfig(), /NMS_API_KEY/);
  });

  it('masks secrets safely', () => {
    assert.equal(api.maskSecret(''), '(없음)');
    assert.equal(api.maskSecret('short'), '****');
    assert.equal(api.maskSecret('secret-access-key-123456'), 'secr****3456');
  });

  it('builds query strings and extracts pageable items', () => {
    assert.equal(
      api.toQueryString({ a: 1, b: null, c: undefined, arr: ['x', null, 'y'] }),
      '?a=1&arr=x&arr=y'
    );
    assert.deepEqual(api.extractItems([1, 2]), [1, 2]);
    assert.deepEqual(api.extractItems({ content: [{ id: 1 }] }), [{ id: 1 }]);
    assert.deepEqual(api.extractItems(null), []);
  });

  it('sends X-API-KEY header, AbortSignal, and unwraps xv3 envelope', async () => {
    let capturedUrl;
    let capturedOpts;
    global.fetch = async (url, opts) => {
      capturedUrl = url;
      capturedOpts = opts;
      return mockResponse({
        status: 200,
        body: { status: 2000, message: 'OK', data: [{ id: 10 }] },
      });
    };

    const result = await api.get('/xv3/api/sites', { disabled: false });
    assert.equal(capturedUrl, 'https://nms.example.local:8443/xv3/api/sites?disabled=false');
    assert.equal(capturedOpts.method, 'GET');
    assert.equal(capturedOpts.headers['X-API-KEY'], 'secret-access-key-123456');
    assert.ok(capturedOpts.signal);
    assert.deepEqual(result, [{ id: 10 }]);
  });

  it('preserves null/empty data in xv3 envelope', async () => {
    global.fetch = async () =>
      mockResponse({ status: 200, body: { status: 2000, message: 'OK', data: null } });

    const result = await api.get('/xv3/api/device/999');
    assert.equal(result, null);
  });

  it('maps 401, 403, 404, 429, 500 and never leaks API key', async () => {
    const cases = [
      { status: 401, body: { message: '유효하지 않은 API Key입니다.' }, match: /401 Unauthorized/ },
      { status: 403, body: { message: 'Forbidden' }, match: /403 Forbidden/ },
      { status: 404, body: { message: 'Not Found' }, match: /404 Not Found/ },
      { status: 429, body: {}, headers: { 'retry-after': '30' }, match: /429 Too Many Requests.*30초/ },
      { status: 500, body: { message: 'Internal Error' }, match: /NMS 서버 오류 \(500\)/ },
    ];

    for (const c of cases) {
      global.fetch = async () => mockResponse({ status: c.status, ok: false, body: c.body, headers: c.headers });
      await assert.rejects(
        () => api.get('/xv3/api/test'),
        (err) => {
          assert.match(err.message, c.match);
          assert.equal(err.message.includes('secret-access-key-123456'), false);
          return true;
        }
      );
    }
  });

  it('handles non-2000 xv3 envelope status, timeout, and network errors', async () => {
    global.fetch = async () =>
      mockResponse({ status: 200, body: { status: 4001, message: '잘못된 요청' } });
    await assert.rejects(() => api.post('/xv3/api/test', {}), /API 오류 \[4001\].*잘못된 요청/);

    global.fetch = async () => {
      const err = new Error('The operation was aborted due to timeout');
      err.name = 'TimeoutError';
      throw err;
    };
    await assert.rejects(() => api.get('/xv3/api/slow'), /API 요청 타임아웃 \(5000ms\)/);

    global.fetch = async () => {
      const err = new TypeError('fetch failed');
      err.cause = { code: 'ECONNREFUSED' };
      throw err;
    };
    await assert.rejects(() => api.get('/xv3/api/down'), /API 서버 연결 실패.*ECONNREFUSED/);
  });
});
