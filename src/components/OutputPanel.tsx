import { useEffect, useRef, useState } from 'react'
import { useAppStore } from '../store/appStore'
import { useCapability } from '../lib/claudeRuntime'
import { buildCvDocx, buildLetterDocx } from '../lib/docxExport'
import { buildCvPdf } from '../lib/cvPdf'
import { TRACKER } from '../lib/tracker'
import { runTrackerSave } from '../lib/trackerRun'

type Tab = 'letter' | 'cv' | 'gaps'

export default function OutputPanel() {
  const output = useAppStore((s) => s.output)
  const cvOutput = useAppStore((s) => s.cvOutput)
  const gapsOutput = useAppStore((s) => s.gapsOutput)
  const jobInput = useAppStore((s) => s.jobInput)
  const outputMode = useAppStore((s) => s.outputMode)
  const isGenerating = useAppStore((s) => s.isGenerating)
  const tracker = useAppStore((s) => s.tracker)

  const [tab, setTab] = useState<Tab>('letter')
  const [copied, setCopied] = useState(false)
  const [notice, setNotice] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)
  const [downloads, setDownloads] = useState<any>(null)
  const boxRef = useRef<HTMLTextAreaElement>(null)

  useEffect(() => {
    let live = true
    useCapability('downloads').then((d) => live && setDownloads(d))
    return () => {
      live = false
    }
  }, [])

  const showTabs = outputMode === 'cv_and_letter' || cvOutput !== ''
  const activeTab: Tab = showTabs ? tab : 'letter'
  const isPitch = outputMode === 'pitch' && !showTabs
  const text =
    activeTab === 'cv' ? cvOutput : activeTab === 'gaps' ? gapsOutput : output

  useEffect(() => {
    if (!showTabs) setTab('letter')
  }, [showTabs])

  async function handleCopy() {
    if (!text) return
    setNotice(null)
    try {
      await navigator.clipboard.writeText(text)
      setCopied(true)
      window.setTimeout(() => setCopied(false), 1500)
    } catch {
      // Clipboard refused: select the text so Ctrl/Cmd+C works.
      boxRef.current?.select()
      setNotice('Text selected. Press Ctrl+C (or Cmd+C) to copy.')
    }
  }

  const safe = (s: string) => s.replace(/[\\/:*?"<>|]+/g, ' ').replace(/\s+/g, ' ').trim()
  const nameFor = (kind: string, ext: string) => {
    const parts = [jobInput.companyName, kind, jobInput.jobTitle]
      .map((p) => safe(p))
      .filter(Boolean)
    return `${parts.join(' - ') || kind}.${ext}`
  }

  async function handleDownload(format?: 'word') {
    if (!text || !downloads) return
    setNotice(null)
    setSaving(true)
    try {
      let filename: string
      let data: Blob | string
      if (activeTab === 'cv' && format === 'word') {
        filename = nameFor('CV', 'docx')
        data = await buildCvDocx(cvOutput)
      } else if (activeTab === 'cv') {
        filename = nameFor('CV', 'pdf')
        data = await buildCvPdf(cvOutput)
      } else if (activeTab === 'gaps') {
        filename = nameFor('Gaps', 'txt')
        data = gapsOutput
      } else if (isPitch) {
        filename = nameFor('Pitch', 'txt')
        data = output
      } else {
        filename = nameFor('Cover Letter', 'docx')
        data = await buildLetterDocx(output)
      }
      await downloads.save({ filename, data })
    } catch (e: any) {
      if (e?.code !== 'declined') setNotice('Could not save the file here.')
    } finally {
      setSaving(false)
    }
  }

  const tabs: { id: Tab; label: string }[] = [
    { id: 'letter', label: 'Cover Letter' },
    { id: 'cv', label: 'Tailored CV' },
    { id: 'gaps', label: 'Gaps' },
  ]

  const placeholder =
    activeTab === 'cv'
      ? 'Your tailored CV will appear here…'
      : activeTab === 'gaps'
        ? 'Requirements in the job post that your CV does not cover will appear here…'
        : isPitch
          ? 'Your generated pitch will appear here…'
          : 'Your generated cover letter will appear here…'

  const downloadLabel =
    activeTab === 'cv'
      ? 'Download CV as PDF'
      : activeTab === 'gaps' || isPitch
        ? 'Download as .txt'
        : 'Download as Word (.docx)'

  return (
    <section className="rounded-lg border border-gray-200 bg-white p-5 shadow-sm">
      <h2 className="mb-3 text-lg font-semibold text-gray-800">
        3 &middot; {isPitch ? 'Pitch Output' : 'Output'}
      </h2>

      {showTabs && (
        <div role="tablist" className="mb-3 flex flex-wrap gap-1 border-b border-gray-200">
          {tabs.map((t) => {
            const selected = activeTab === t.id
            return (
              <button
                key={t.id}
                type="button"
                role="tab"
                aria-selected={selected}
                onClick={() => setTab(t.id)}
                className={
                  '-mb-px border-b-2 px-3 py-2 text-sm font-medium transition ' +
                  (selected
                    ? 'border-indigo-600 text-indigo-700'
                    : 'border-transparent text-gray-500 hover:text-gray-800')
                }
              >
                {t.label}
              </button>
            )
          })}
        </div>
      )}

      <textarea
        id="output-text"
        ref={boxRef}
        readOnly
        value={text || (isGenerating ? 'Thinking…' : '')}
        rows={18}
        placeholder={placeholder}
        className="w-full resize-y rounded-md border border-gray-300 bg-gray-50 p-3 font-mono text-sm leading-relaxed text-gray-800 outline-none"
      />

      <div className="mt-3 flex flex-wrap gap-2">
        <button
          type="button"
          onClick={handleCopy}
          disabled={!text}
          className="rounded-md bg-gray-800 px-4 py-2 text-sm font-medium text-white transition hover:bg-gray-900 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {copied ? 'Copied!' : 'Copy to clipboard'}
        </button>
        {downloads && (
          <button
            type="button"
            onClick={() => handleDownload()}
            disabled={!text || isGenerating || saving}
            className="rounded-md border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 transition hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {saving ? 'Preparing…' : downloadLabel}
          </button>
        )}
        {downloads && activeTab === 'cv' && (
          <button
            type="button"
            onClick={() => handleDownload('word')}
            disabled={!text || isGenerating || saving}
            className="rounded-md px-3 py-2 text-sm font-medium text-indigo-700 transition hover:bg-indigo-50 disabled:cursor-not-allowed disabled:opacity-50"
          >
            Word version
          </button>
        )}
      </div>
      {notice && <p className="mt-2 text-sm text-gray-600">{notice}</p>}

      {tracker.state !== 'idle' && (
        <div
          className={
            'mt-4 rounded-md border px-3 py-2 text-sm ' +
            (tracker.state === 'saving'
              ? 'border-gray-200 bg-gray-50 text-gray-600'
              : tracker.result?.ok
                ? 'border-emerald-200 bg-emerald-50 text-emerald-800'
                : 'border-amber-200 bg-amber-50 text-amber-900')
          }
          role="status"
        >
          {tracker.state === 'saving' ? (
            'Saving to Google Drive and the tracker…'
          ) : (
            <div className="flex flex-col gap-1.5">
              <span>{tracker.result?.message}</span>
              <span className="flex flex-wrap gap-x-4 gap-y-1">
                {tracker.result?.cvUrl && (
                  <a className="font-medium underline" href={tracker.result.cvUrl} target="_blank" rel="noreferrer">
                    Open CV (PDF)
                  </a>
                )}
                {tracker.result?.letterUrl && (
                  <a className="font-medium underline" href={tracker.result.letterUrl} target="_blank" rel="noreferrer">
                    Open {outputMode === 'pitch' ? 'pitch' : 'cover letter'}
                  </a>
                )}
                <a className="font-medium underline" href={TRACKER.sheetUrl} target="_blank" rel="noreferrer">
                  Open tracker
                </a>
                {!tracker.result?.ok && tracker.args && (
                  <button
                    type="button"
                    onClick={() => runTrackerSave(tracker.args!)}
                    className="font-medium underline"
                  >
                    Try again
                  </button>
                )}
              </span>
            </div>
          )}
        </div>
      )}
    </section>
  )
}
