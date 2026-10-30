import { useRef, useState } from 'react'
import { useAppStore } from '../store/appStore'
import {
  generateCoverLetter,
  generateTailoredCv,
  splitCvAndGaps,
} from '../lib/claudeApi'
import type { OutputMode, ToneOption } from '../types'
import { describeSampleError, isSampleError } from '../lib/claudeRuntime'
import { runTrackerSave } from '../lib/trackerRun'

const TONES: { value: ToneOption; label: string }[] = [
  { value: 'professional', label: 'Professional' },
  { value: 'assertive', label: 'Assertive' },
  { value: 'warm', label: 'Warm' },
]

const OUTPUT_MODES: { value: OutputMode; label: string; subtitle?: string }[] = [
  { value: 'cover_letter', label: 'Cover Letter' },
  { value: 'pitch', label: 'Pitch', subtitle: 'For Upwork & freelance' },
  {
    value: 'cv_and_letter',
    label: 'Tailored CV + Cover Letter',
    subtitle: 'Built from your uploaded CV',
  },
]

export default function GeneratorControls() {
  const tone = useAppStore((s) => s.tone)
  const setTone = useAppStore((s) => s.setTone)
  const outputMode = useAppStore((s) => s.outputMode)
  const setOutputMode = useAppStore((s) => s.setOutputMode)
  const isGenerating = useAppStore((s) => s.isGenerating)
  const setIsGenerating = useAppStore((s) => s.setIsGenerating)
  const setOutput = useAppStore((s) => s.setOutput)
  const setCvOutput = useAppStore((s) => s.setCvOutput)
  const setGapsOutput = useAppStore((s) => s.setGapsOutput)
  const jobInput = useAppStore((s) => s.jobInput)
  const profiles = useAppStore((s) => s.profiles)
  const activeProfileId = useAppStore((s) => s.activeProfileId)
  const addToHistory = useAppStore((s) => s.addToHistory)
  const trackerEnabled = useAppStore((s) => s.trackerEnabled)
  const setTrackerEnabled = useAppStore((s) => s.setTrackerEnabled)

  const [error, setError] = useState<string | null>(null)
  const ctlRef = useRef<AbortController | null>(null)

  async function handleGenerate() {
    const profile = profiles.find((p) => p.id === activeProfileId)
    if (!profile) {
      setError('Select a profile first (Manage Profiles in the sidebar).')
      return
    }
    const cvMissing =
      profile.resumeText.trim().length < 50 ||
      profile.resumeText.startsWith('Paste your resume')
    if (outputMode === 'cv_and_letter' && cvMissing) {
      setError('Upload your CV first (sidebar button), so the tailored CV has facts to work from.')
      return
    }
    setError(null)
    setIsGenerating(true)
    setOutput('')
    setCvOutput('')
    setGapsOutput('')
    useAppStore.setState({ tracker: { state: 'idle' } })
    const ctl = new AbortController()
    ctlRef.current = ctl
    const opts = { signal: ctl.signal }

    // Keeps partial text on screen after a stop or failure.
    const failureText = (err: unknown) =>
      isSampleError(err) && err.code !== 'refused' ? err.text ?? '' : ''
    const reportError = (err: unknown) => {
      if (isSampleError(err) && err.code === 'cancelled') return
      setError(describeSampleError(err))
    }

    if (outputMode === 'cv_and_letter') {
      // The CV and the letter are written at the same time.
      const [cvRes, letterRes] = await Promise.allSettled([
        generateTailoredCv(profile, jobInput, {
          ...opts,
          onText: (t) => {
            const { cv, gaps } = splitCvAndGaps(t)
            setCvOutput(cv)
            setGapsOutput(gaps)
          },
        }),
        generateCoverLetter(profile, jobInput, tone, 'cover_letter', {
          ...opts,
          onText: setOutput,
        }),
      ])
      if (cvRes.status === 'rejected') {
        const { cv, gaps } = splitCvAndGaps(failureText(cvRes.reason))
        setCvOutput(cv)
        setGapsOutput(gaps)
        reportError(cvRes.reason)
      }
      if (letterRes.status === 'rejected') {
        setOutput(failureText(letterRes.reason))
        reportError(letterRes.reason)
      }
      if (cvRes.status === 'fulfilled' && letterRes.status === 'fulfilled') {
        addToHistory({
          profileName: profile.name,
          jobTitle: jobInput.jobTitle,
          companyName: jobInput.companyName,
          tone,
          outputMode,
          output: letterRes.value,
          cv: cvRes.value.cv,
          gaps: cvRes.value.gaps,
          jobUrl: jobInput.jobUrl,
          platform: jobInput.platform,
          matchScore: cvRes.value.score,
        })
        if (trackerEnabled) {
          runTrackerSave({
            job: { ...jobInput },
            profileName: profile.name,
            tone,
            outputMode,
            letter: letterRes.value,
            cv: cvRes.value.cv,
            score: cvRes.value.score,
            why: cvRes.value.why,
            gapList: cvRes.value.gapList,
          })
        }
      }
      ctlRef.current = null
      setIsGenerating(false)
      return
    }

    try {
      const letter = await generateCoverLetter(
        profile,
        jobInput,
        tone,
        outputMode,
        { ...opts, onText: setOutput }
      )
      setOutput(letter)
      addToHistory({
        profileName: profile.name,
        jobTitle: jobInput.jobTitle,
        companyName: jobInput.companyName,
        tone,
        outputMode,
        output: letter,
        jobUrl: jobInput.jobUrl,
        platform: jobInput.platform,
      })
      if (trackerEnabled) {
        runTrackerSave({
          job: { ...jobInput },
          profileName: profile.name,
          tone,
          outputMode,
          letter,
        })
      }
    } catch (err) {
      setOutput(failureText(err))
      reportError(err)
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
            : outputMode === 'cv_and_letter'
              ? 'Generate CV + Cover Letter'
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

      <label
        htmlFor="tracker-toggle"
        className="mt-3 flex cursor-pointer items-start gap-2 text-sm text-gray-600"
      >
        <input
          id="tracker-toggle"
          type="checkbox"
          checked={trackerEnabled}
          onChange={(e) => setTrackerEnabled(e.target.checked)}
          className="mt-0.5 h-4 w-4 rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
        />
        <span>
          Save files to Google Drive and log this job in the tracker sheet
        </span>
      </label>

      {error && <p className="mt-3 text-sm text-red-600">{error}</p>}
    </section>
  )
}
