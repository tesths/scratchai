export interface ResponseLike {
  ok: boolean
  status: number
  json: () => Promise<unknown>
}

export type FetchLike = (
  input: RequestInfo | URL,
  init?: RequestInit,
) => Promise<ResponseLike>

export function buildApiUrl(baseUrl: string | undefined, path: string): string {
  const normalizedBase = baseUrl?.trim()

  if (!normalizedBase) {
    return path
  }

  const baseWithSlash = normalizedBase.endsWith('/')
    ? normalizedBase
    : `${normalizedBase}/`

  return new URL(path.replace(/^\//, ''), baseWithSlash).toString()
}

export async function requestJson<T>(
  fetchImpl: FetchLike,
  url: string,
  init?: RequestInit,
): Promise<T> {
  const response = await fetchImpl(url, init)

  if (!response.ok) {
    const body = await safeJson(response)
    throw new Error(resolveErrorMessage(response.status, body))
  }

  return (await response.json()) as T
}

async function safeJson(response: ResponseLike): Promise<unknown> {
  try {
    return await response.json()
  } catch {
    return null
  }
}

function resolveErrorMessage(status: number, body: unknown): string {
  if (typeof body === 'string' && body.trim()) {
    return body
  }

  if (body && typeof body === 'object') {
    const record = body as Record<string, unknown>
    if (typeof record.message === 'string' && record.message.trim()) {
      return record.message
    }
    if (typeof record.error === 'string' && record.error.trim()) {
      return record.error
    }
  }

  return `请求失败（${status}）`
}
