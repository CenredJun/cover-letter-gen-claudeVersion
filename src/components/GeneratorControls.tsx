import { useRef, useState } from 'react'
import { useAppStore } from '../store/appStore'
import { generateCoverLetter } from '../lib/claudeApi'
import type { OutputMode, ToneOption } from '../types'
import { describeSampleError, isSampleError } from '../lib/claudeRuntime'

const TONES: { value: ToneOption; label: string }[] = [
  { value: 'professional', label: 'Professional' },
  { value: 'assertive', label: 'Assertive' },
  { value: 'warm', label: 'Warm' },
]

const OUTPUT_MODES: { value: OutputMode; label: string; subtitle?: string }[] = [
  { value: 'cover_letter', label: 'Cover Letter' },
  { value: 'pitch', label: 'Pitch', subtitle: 'For Upwork & freelance' },
]

export default function GeneratorControls() {
  const tone = useAppStore((s) => s.tone)
  const setTone = useAppStore((s) => s.setTone)
  const outputMode = useAppStore((s) => s.outputMode)
  const setOutputMode = useAppStore((s) => s.setOutputMode)
  const isGenerating = useAppStore((s) => s.isGenerating)
  const setIsGenerating = useAppStore((s) => s.setIsGenerating)
  const setOutput = useAppStore((s) => s.setOutput)
  const jobInput = useAppStore((s) => s.jobInput)
  const profiles = useAppStore((s) => s.profiles)
  const activeProfileId = useAppStore((s) => s.activeProfileId)
  const addToHistory = useAppStore((s) => s.addToHistory)

  const [error, setError] = useState<string | null>(null)
  const ctlRef = useRef<AbortController | null>(null)

  async function handleGenerate() {
    const profile = profiles.find((p) => p.id === activeProfileId)
    if (!profile) {
      setError('Select a profile first (Manage Profiles in the sidebar).')
      return
    }
    setError(null)
    setIsGenerating(true)
    setOutput('')
    const ctl = new AbortController()
    ctlRef.current = ctl
    try {
      const letter = await generateCoverLetter(
        profile,
        jobInput,
        tone,
        outputMode,
        { signal: ctl.signal, onText: setOutput }
      )
      setOutput(letter)
      addToHistory({
        profileName: profile.name,
        jobTitle: jobInput.jobTitle,
        companyName: jobInput.companyName,
        tone,
        outputMode,
        output: letter,
      })
    } catch (err) {
      if (isSampleError(err)) {
        // Keep whatever was written before the stop or failure.
        setOutput(err.code === 'refused' ? '' : err.text ?? '')
        if (err.code !== 'cancelled') setError(describeSampleError(err))
      } else {
        setError(describeSampleError(err))
      }
    } finally {
      ctlRef.current = null
      setIsGenerating(false)
    }
  }

  return (
    <section className="rounded-lg border border-gray-200 bg-white p-5 shadow-sm">
      <h2 className="mb-3 text-lg font-semibold text-gray-800">
        2 &middot; Controls
      </h2>

      <div className="mb-4">
        <span className="mb-2 block text-sm font-medium text-gray-600">
          Output type
        </span>
        <div className="flex flex-wrap gap-2">
          {OUTPUT_MODES.map((m) => {
            const active = outputMode === m.value
            return (
              <button
                key={m.value}
                type="button"
                onClick={() => setOutputMode(m.value)}
                className={
                  'rounded-full px-4 py-1.5 text-sm font-medium transition ' +
                  (active
                    ? 'bg-indigo-600 text-white'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200')
                }
              >
                <span className="block leading-tight">{m.label}</span>
                {m.subtitle && (
                  <span
                    className={
                      'block text-[11px] leading-tight ' +
                      (active ? 'text-indigo-100' : 'text-gray-500')
                    }
                  >
                    {m.subtitle}
                  </span>
                )}
              </button>
            )
          })}
        </div>
      </div>

      <div className="mb-4">
        <span className="mb-2 block text-sm font-medium text-gray-600">
          Tone
        </span>
        <div className="flex flex-wrap gap-2">
          {TONES.map((t) => {
            const active = tone === t.value
            return (
              <button
                key={t.value}
                type="button"
                onClick={() => setTone(t.value)}
                className={
                  'rounded-full px-4 py-1.5 text-sm font-medium transition ' +
                  (active
                    ? 'bg-indigo-600 text-white'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200')
                }
              >
                {t.label}
              </button>
            )
          })}
        </div>
      </div>

      <div className="flex gap-2">
      <button
        type="button"
        onClick={handleGenerate}
        disabled={isGenerating}
        className="flex flex-1 items-center justify-center gap-2 rounded-md bg-indigo-600 px-4 py-3 text-sm font-semibold text-white transition hover:bg-indigo-700 disabled:cursor-not-allowed disabled:opacity-60"
      >
        {isGenerating && (
          <span className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
        )}
        {isGenerating
          ? 'Generating…'
          : outputMode === 'pitch'
            ? 'Generate Pitch'
            : 'Generate Cover Letter'}
      </button>
      {isGenerating && (
        <button
          type="button"
          onClick={() => ctlRef.current?.abort()}
          className="rounded-md border border-gray-300 bg-white px-4 py-3 text-sm font-semibold text-gray-700 transition hover:bg-gray-50"
        >
          Stop
        </button>
      )}
      </div>

      {error && <p className="mt-3 text-sm text-red-600">{error}</p>}
    </section>
  )
}
