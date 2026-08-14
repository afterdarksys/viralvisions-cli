import { randomUUID } from 'node:crypto'

export class ApiError extends Error {
  constructor(message, { status, body, requestId }) {
    super(message)
    this.name = 'ApiError'
    this.status = status
    this.body = body
    this.requestId = requestId
  }
}

export function joinUrl(baseUrl, path) {
  return `${baseUrl.replace(/\/+$/, '')}/${path.replace(/^\/+/, '')}`
}

export function idempotencyKey(prefix = 'vv') {
  return `${prefix}-${randomUUID()}`
}

export async function apiRequest({
  baseUrl,
  token,
  method = 'GET',
  path,
  body,
  timeoutMs = 30000,
  requestId = randomUUID(),
  idempotency,
  fetchImpl = globalThis.fetch,
}) {
  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), timeoutMs)
  const headers = {
    Accept: 'application/json',
    'X-ViralVisions-Client': 'viralvisions-cli/0.1.0',
    'X-ViralVisions-Request-Source': 'cli',
    'X-Request-Id': requestId,
  }
  if (token) headers.Authorization = `Bearer ${token}`
  if (body !== undefined) headers['Content-Type'] = 'application/json'
  if (idempotency) headers['Idempotency-Key'] = idempotency

  let response
  try {
    response = await fetchImpl(joinUrl(baseUrl, path), {
      method,
      headers,
      body: body === undefined ? undefined : JSON.stringify(body),
      signal: controller.signal,
    })
  } finally {
    clearTimeout(timer)
  }

  const text = await response.text()
  let parsed = null
  if (text) {
    try {
      parsed = JSON.parse(text)
    } catch {
      parsed = { raw: text }
    }
  }

  if (!response.ok) {
    const message = parsed?.error?.message || parsed?.error || `HTTP ${response.status}`
    throw new ApiError(message, {
      status: response.status,
      body: parsed,
      requestId: response.headers.get('x-request-id') || requestId,
    })
  }

  return {
    status: response.status,
    requestId: response.headers.get('x-request-id') || parsed?.requestId || requestId,
    body: parsed,
  }
}
