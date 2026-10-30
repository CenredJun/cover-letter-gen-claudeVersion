// Access to the claude.ai artifact runtime (window.claude).
// Each capability resolves to null when this view cannot use it
// (e.g. the page is opened outside claude.ai), so callers must handle absence.

type ClaudeRuntime = { use: (name: string) => Promise<any> }

declare global {
  interface Window {
    claude?: ClaudeRuntime
  }
}

const cache = new Map<string, Promise<any>>()

export function useCapability<T = any>(name: string): Promise<T | null> {
  if (!cache.has(name)) {
    const rt = window.claude
    cache.set(
      name,
      rt ? rt.use(name).catch(() => null) : Promise.resolve(null)
    )
  }
  return cache.get(name) as Promise<T | null>
}

export interface SampleError {
  code: string
  message: string
  text?: string
}

export type SampleFn = ((
  input: string,
  options?: {
    onText?: (u: { text: string; delta: string }) => void
    signal?: AbortSignal
    modelTier?: 'quick' | 'default' | 'complex'
    cache?: boolean
  }
) => Promise<{ text: string; truncated: boolean }>) & {
  json: (input: string, options?: object) => Promise<unknown>
}

export function isSampleError(e: unknown): e is SampleError {
  return !!e && typeof e === 'object' && 'code' in e
}

// Plain-language messages for the errors a person can actually act on.
export function describeSampleError(e: unknown): string {
  if (!isSampleError(e)) {
    return e instanceof Error ? e.message : 'Something went wrong.'
  }
  switch (e.code) {
    case 'not_granted':
      return 'Claude access was not allowed for this page. Reload and choose Allow when asked.'
    case 'sampling_disabled':
      return 'Claude is not available for this account.'
    case 'rate_limited':
      return 'You have hit a usage limit. Wait a bit, then try again.'
    case 'session_expired':
      return 'Your claude.ai session expired. Sign in again, then retry.'
    case 'refused':
      return 'Claude declined this request. Try rewording the job details.'
    case 'prompt_too_large':
      return 'The resume and job description are too long. Shorten one of them.'
    case 'cancelled':
      return 'Stopped.'
    default:
      return 'Claude could not finish. Try again.'
  }
}
