'use strict';
require('dotenv').config({ quiet: true });

const DEFAULT_TIMEOUT_MS = 15000;

/**
 * 비밀키/토큰 마스킹 유틸 (로그 및 에러 메시지 노출 방지)
 */
function maskSecret(value) {
  if (!value || typeof value !== 'string') return '(없음)';
  const trimmed = value.trim();
  if (trimmed.length <= 8) return '****';
  return `${trimmed.slice(0, 4)}****${trimmed.slice(-4)}`;
}

/**
 * 환경변수에서 API 설정 로드 및 검증
 */
function getConfig() {
  const baseUrl = (process.env.NMS_API_BASE_URL || '').trim().replace(/\/$/, '');
  const apiKey = (process.env.NMS_API_KEY || '').trim();
  const parsedTimeout = Number(process.env.NMS_API_TIMEOUT_MS);
  const timeoutMs = Number.isFinite(parsedTimeout) && parsedTimeout > 0
    ? parsedTimeout
    : DEFAULT_TIMEOUT_MS;

  if (!baseUrl) {
    throw new Error('NMS_API_BASE_URL 환경변수가 설정되지 않았습니다. .env 또는 MCP 설정을 확인하세요.');
  }
  if (!/^https?:\/\//i.test(baseUrl)) {
    throw new Error('NMS_API_BASE_URL은 http:// 또는 https://로 시작해야 합니다.');
  }
  if (!apiKey) {
    throw new Error('NMS_API_KEY 환경변수가 설정되지 않았습니다. Access Key를 설정하세요.');
  }

  return { baseUrl, apiKey, timeoutMs };
}

/**
 * query object → URL query string 변환
 * null/undefined 값은 제외, 배열은 key=v1&key=v2 형태
 */
function toQueryString(params = {}) {
  const parts = [];
  for (const [k, v] of Object.entries(params)) {
    if (v == null) continue;
    if (Array.isArray(v)) {
      for (const item of v) {
        if (item == null) continue;
        parts.push(`${encodeURIComponent(k)}=${encodeURIComponent(item)}`);
      }
    } else {
      parts.push(`${encodeURIComponent(k)}=${encodeURIComponent(v)}`);
    }
  }
  return parts.length ? `?${parts.join('&')}` : '';
}

/**
 * Pageable 응답(content 배열) 또는 일반 배열 모두 처리
 */
function extractItems(data) {
  if (Array.isArray(data)) return data;
  if (data && Array.isArray(data.content)) return data.content;
  return data != null ? [data] : [];
}

/**
 * HTTP 상태 코드별 사용자(LLM) 친화적 에러 생성
 */
function formatHttpError(status, method, path, body, retryAfter) {
  const detail = body?.message || body?.error || '';
  const suffix = detail ? ` (${detail})` : '';

  switch (status) {
    case 401:
      return new Error(`인증 실패 (401 Unauthorized): NMS_API_KEY가 유효하지 않거나 만료되었습니다.${suffix}`);
    case 403:
      return new Error(`접근 권한 없음 (403 Forbidden): ${method} ${path} 호출 권한이 없습니다.${suffix}`);
    case 404:
      return new Error(`리소스를 찾을 수 없음 (404 Not Found): ${method} ${path}${suffix}`);
    case 429: {
      const wait = retryAfter ? ` ${retryAfter}초 후 재시도하세요.` : ' 잠시 후 다시 시도하세요.';
      return new Error(`요청 한도 초과 (429 Too Many Requests):${wait}${suffix}`);
    }
    default:
      if (status >= 500) {
        return new Error(`NMS 서버 오류 (${status}): ${method} ${path}${suffix}`);
      }
      return new Error(`API 요청 오류 (${status}): ${method} ${path}${suffix}`);
  }
}

/**
 * xv3 API 공통 응답 파싱
 * 응답 구조: { status: 2000, message: 'OK', data: ... }
 */
async function parseResponse(res, method, path) {
  const rawText = await res.text();
  let body = null;

  if (rawText) {
    try {
      body = JSON.parse(rawText);
    } catch {
      if (!res.ok) {
        throw formatHttpError(res.status, method, path, { message: rawText.slice(0, 200) }, res.headers?.get?.('retry-after'));
      }
      throw new Error(`API 응답 JSON 파싱 실패 [${res.status}] ${method} ${path}`);
    }
  }

  if (!res.ok) {
    throw formatHttpError(res.status, method, path, body, res.headers?.get?.('retry-after'));
  }

  if (body && typeof body === 'object' && body.status != null && body.status !== 2000) {
    const msg = body.message || body.error || `비정상 응답 코드 ${body.status}`;
    throw new Error(`API 오류 [${body.status}] ${method} ${path}: ${msg}`);
  }

  if (body && typeof body === 'object' && Object.prototype.hasOwnProperty.call(body, 'data')) {
    return body.data;
  }
  return body;
}

/**
 * 핵심 fetch 래퍼 — 모든 요청에 X-API-KEY 헤더 및 타임아웃 적용
 */
async function request(method, path, { params, body, timeoutMs: overrideTimeout } = {}) {
  const { baseUrl, apiKey, timeoutMs } = getConfig();
  const effectiveTimeout = overrideTimeout ?? timeoutMs;
  const qs = params ? toQueryString(params) : '';
  const url = `${baseUrl}${path}${qs}`;

  const headers = {
    'X-API-KEY': apiKey,
    'Content-Type': 'application/json',
  };

  const options = {
    method,
    headers,
    signal: AbortSignal.timeout(effectiveTimeout),
  };
  if (body != null) options.body = JSON.stringify(body);

  let res;
  try {
    res = await fetch(url, options);
  } catch (err) {
    if (err?.name === 'TimeoutError' || err?.name === 'AbortError') {
      throw new Error(`API 요청 타임아웃 (${effectiveTimeout}ms): ${method} ${path}`);
    }
    const reason = err?.cause?.code || err?.message || '알 수 없는 네트워크 오류';
    throw new Error(`API 서버 연결 실패 (${method} ${path}): ${reason}`);
  }

  return parseResponse(res, method, path);
}

/** GET 요청. params: query string 객체 */
function get(path, params = {}, opts = {}) {
  return request('GET', path, { params, ...opts });
}

/** POST 요청. body: JSON 직렬화할 객체 */
function post(path, body, opts = {}) {
  return request('POST', path, { body, ...opts });
}

/** PUT 요청 */
function put(path, body, opts = {}) {
  return request('PUT', path, { body, ...opts });
}

/** PATCH 요청 */
function patch(path, body, opts = {}) {
  return request('PATCH', path, { body, ...opts });
}

/** DELETE 요청 */
function del(path, params = {}, opts = {}) {
  return request('DELETE', path, { params, ...opts });
}

/**
 * Pageable 응답에서 전체 items 배열 반환
 * size 기본 1000으로 최대한 한 번에 가져옴
 */
function getAll(path, params = {}, opts = {}) {
  return get(path, { size: 1000, ...params }, opts);
}

module.exports = {
  get,
  post,
  put,
  patch,
  del,
  getAll,
  toQueryString,
  extractItems,
  maskSecret,
  getConfig,
};
