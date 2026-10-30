import { useState } from 'react'
import { useAppStore } from '../store/appStore'
import { parseJobDescription } from '../lib/claudeApi'
import type { JobInput } from '../types'
import { describeSampleError } from '../lib/claudeRuntime'

const FIELDS: { key: keyof JobInput; label: string; multiline: boolean }[] = [
  { key: 'jobTitle', label: 'Job Title', multiline: false },
  { key: 'companyName', label: 'Company Name', multiline: false },
  { key: 'addressTo', label: 'Address To', multiline: false },
  { key: 'platform', label: 'Platform', multiline: false },
  { key: 'companyOverview', label: 'Company Overview', multiline: true },
  { key: 'jobSummary', label: 'Job Summary', multiline: true },
  { key: 'responsibilities', label: 'Responsibilities', multiline: true },
  { key: 'qualifications', label: 'Qualifications', multiline: true },
  { key: 'additionals', label: 'Additionals', multiline: true },
]

export default function JobDescriptionInput() {
  const jobInput = useAppStore((s) => s.jobInput)
  const updateJobInput = useAppStore((s) => s.updateJobInput)

  const [rawText, setRawText] = useState('')
  const [fieldsOpen, setFieldsOpen] = useState(true)
  const [isParsing, setIsParsing] = useState(false)
  const [parseError, setParseError] = useState<string | null>(null)

  async function handleAutoParse() {
    if (!rawText.trim()) {
      setParseError('Paste a job description first.')
      return
    }
    setParseError(null)
    setIsParsing(true)
    try {
      const parsed = await parseJobDescription(rawText)
      updateJobInput(parsed)
      setFieldsOpen(true)
    } catch (err) {
      setParseError(describeSampleError(err))
    } finally {
      setIsParsing(false)
    }
  }

  return (
    <section className="rounded-lg border border-gray-200 bg-white p-5 shadow-sm">
      <h2 className="mb-3 text-lg font-semibold text-gray-800">
        1 &middot; Job Description
      </h2>

      <label
        htmlFor="raw-jd"
        className="mb-1 block text-sm font-medium text-gray-600"
      >
        Paste full job description here
      </label>
      <textarea
        id="raw-jd"
        value={rawText}
        onChange={(e) => setRawText(e.target.value)}
        rows={8}
        placeholder="Paste the entire job posting, then click Auto-parse to fill the fields below…"
        className="w-full resize-y rounded-md border border-gray-300 p-3 text-sm text-gray-800 outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
      />

      <div className="mt-3 flex flex-wrap items-center gap-3">
        <button
          type="button"
          onClick={handleAutoParse}
          disabled={isParsing}
          className="rounded-md bg-indigo-600 px-4 py-2 text-sm font-medium text-white transition hover:bg-indigo-700 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {isParsing ? 'Parsing…' : 'Auto-parse with Claude'}
        </button>
        <button
          type="button"
          onClick={() => setFieldsOpen((o) => !o)}
          className="text-sm font-medium text-indigo-600 hover:text-indigo-800"
        >
          {fieldsOpen ? 'Hide fields ▲' : 'Show fields ▼'}
        </button>
        {parseError && (
          <span className="text-sm text-red-600">{parseError}</span>
        )}
      </div>

      {fieldsOpen && (
        <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2">
          {FIELDS.map((field) => (
            <div
              key={field.key}
              className={field.multiline ? 'sm:col-span-2' : ''}
            >
              <label
                htmlFor={`field-${field.key}`}
                className="mb-1 block text-sm font-medium text-gray-600"
              >
                {field.label}
              </label>
              {field.multiline ? (
                <textarea
                  id={`field-${field.key}`}
                  value={jobInput[field.key]}
                  onChange={(e) =>
                    updateJobInput({ [field.key]: e.target.value })
                  }
                  rows={3}
                  className="w-full resize-y rounded-md border border-gray-300 p-2 text-sm text-gray-800 outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
                />
              ) : (
                <input
                  id={`field-${field.key}`}
                  type="text"
                  value={jobInput[field.key]}
                  onChange={(e) =>
                    updateJobInput({ [field.key]: e.target.value })
                  }
                  className="w-full rounded-md border border-gray-300 p-2 text-sm text-gray-800 outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
                />
              )}
            </div>
          ))}
        </div>
      )}
    </section>
  )
}
