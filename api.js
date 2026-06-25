'use strict';
require('dotenv').config({ quiet: true });

const BASE_URL = (process.env.NMS_API_BASE_URL || '').replace(/\/$/, '');
const API_KEY  = process.env.NMS_API_KEY || '';

if (!BASE_URL) {
  process.stderr.write('[api.js] 경고: NMS_API_BASE_URL이 설정되지 않았습니다.\n');
}

// ────────────────────────────────────────────────────────
// 공통 요청 헬퍼
// ────────────────────────────────────────────────────────

/**
 * query object → URL query string 변환
 * null/undefined 값은 제외, 배열은 key=v1&key=v2 형태
 */
function toQueryString(params = {}) {
  const parts = [];
  for (const [k, v] of Object.entries(params)) {
    if (v == null) continue;
    if (Array.isArray(v)) {
      for (const item of v) parts.push(`${encodeURIComponent(k)}=${encodeURIComponent(item)}`);
    } else {
      parts.push(`${encodeURIComponent(k)}=${encodeURIComponent(v)}`);
    }
  }
  return parts.length ? `?${parts.join('&')}` : '';
}

/**
 * xv3 API 공통 응답 파싱
 * 응답 구조: { status: 2000, message: 'OK', data: ... }
 * status !== 2000 이면 에러로 처리
 */
async function parseResponse(res, url) {
  let body;
  try {
    body = await res.json();
  } catch {
    throw new Error(`API 응답 파싱 실패 [${res.status}] ${url}`);
  }

  if (!res.ok || (body.status && body.status !== 2000)) {
    const msg = body.message || body.error || `HTTP ${res.status}`;
    throw new Error(`API 오류 [${body.status ?? res.status}] ${url}: ${msg}`);
  }

  return body.data ?? body;
}

/**
 * 핵심 fetch 래퍼 — 모든 요청에 x-API-KEY 헤더 포함
 */
async function request(method, path, { params, body } = {}) {
  const qs  = params ? toQueryString(params) : '';
  const url = `${BASE_URL}${path}${qs}`;

  const headers = {
    'x-API-KEY':    API_KEY,
    'Content-Type': 'application/json',
  };

  const options = { method, headers };
  if (body != null) options.body = JSON.stringify(body);

  const res = await fetch(url, options);
  return parseResponse(res, url);
}

// ────────────────────────────────────────────────────────
// 외부 공개 메서드
// ────────────────────────────────────────────────────────

/** GET 요청. params: query string 객체 */
function get(path, params = {}) {
  return request('GET', path, { params });
}

/** POST 요청. body: JSON 직렬화할 객체 */
function post(path, body) {
  return request('POST', path, { body });
}

/** PUT 요청 */
function put(path, body) {
  return request('PUT', path, { body });
}

/** PATCH 요청 */
function patch(path, body) {
  return request('PATCH', path, { body });
}

/** DELETE 요청 */
function del(path, params = {}) {
  return request('DELETE', path, { params });
}

/**
 * Pageable 응답에서 전체 items 배열 반환
 * xv3 API pageable 구조: data.content or data (array)
 * size 기본 1000으로 최대한 한 번에 가져옴
 */
function getAll(path, params = {}) {
  return get(path, { size: 1000, ...params });
}

module.exports = { get, post, put, patch, del, getAll, toQueryString };
