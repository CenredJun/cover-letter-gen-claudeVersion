import { useEffect, useRef, useState } from 'react'
import { useAppStore } from '../store/appStore'
import { useCapability } from '../lib/claudeRuntime'

export default function OutputPanel() {
  const output = useAppStore((s) => s.output)
  const jobInput = useAppStore((s) => s.jobInput)
  const outputMode = useAppStore((s) => s.outputMode)
  const isGenerating = useAppStore((s) => s.isGenerating)
  const [copied, setCopied] = useState(false)
  const [notice, setNotice] = useState<string | null>(null)
  const [downloads, setDownloads] = useState<any>(null)
  const boxRef = useRef<HTMLTextAreaElement>(null)

  useEffect(() => {
    let live = true
    useCapability('downloads').then((d) => live && setDownloads(d))
    return () => {
      live = false
    }
  }, [])

  async function handleCopy() {
    if (!output) return
    try {
      await navigator.clipboard.writeText(output)
      setCopied(true)
      window.setTimeout(() => setCopied(false), 1500)
    } catch {
      // Clipboard refused: select the text so Ctrl/Cmd+C works.
      boxRef.current?.select()
      setNotice('Text selected. Press Ctrl+C (or Cmd+C) to copy.')
    }
  }

  function handleDownload() {
    if (!output || !downloads) return
    const safe = (s: string) => s.replace(/[^a-z0-9]+/gi, '-').replace(/^-|-$/g, '')
    const namePart =
      [jobInput.companyName, jobInput.jobTitle].filter(Boolean).map(safe).join('_') ||
      'cover-letter'
    setNotice(null)
    downloads
      .save({ filename: `${namePart}.txt`, data: output })
      .catch((e: { code?: string }) => {
        if (e?.code !== 'declined') setNotice('Could not save the file here.')
      })
  }

  return (
    <section className="rounded-lg border border-gray-200 bg-white p-5 shadow-sm">
      <h2 className="mb-3 text-lg font-semibold text-gray-800">
        3 &middot; {outputMode === 'pitch' ? 'Pitch Output' : 'Output'}
      </h2>

      <textarea
        ref={boxRef}
        readOnly
        value={output || (isGenerating ? 'Thinking…' : '')}
        rows={16}
        placeholder="Your generated cover letter will appear here…"
        className="w-full resize-y rounded-md border border-gray-300 bg-gray-50 p-3 font-mono text-sm leading-relaxed text-gray-800 outline-none"
      />

      <div className="mt-3 flex flex-wrap gap-2">
        <button
          type="button"
          onClick={handleCopy}
          disabled={!output}
          className="rounded-md bg-gray-800 px-4 py-2 text-sm font-medium text-white transition hover:bg-gray-900 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {copied ? 'Copied!' : 'Copy to clipboard'}
        </button>
        {downloads && (
        <button
          type="button"
          onClick={handleDownload}
          disabled={!output}
          className="rounded-md border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 transition hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-50"
        >
          Download as .txt
        </button>
        )}
      </div>
      {notice && <p className="mt-2 text-sm text-gray-600">{notice}</p>}
    </section>
  )
}
