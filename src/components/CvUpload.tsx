import { useId, useState } from 'react'
import { CV_ACCEPT, extractCvText } from '../lib/cvExtract'

interface CvUploadProps {
  fileName?: string
  onLoaded: (text: string, fileName: string) => void
  dark?: boolean // sidebar styling
}

// "Upload CV" button: reads a PDF, .docx or .txt and hands back its text.
export default function CvUpload({ fileName, onLoaded, dark }: CvUploadProps) {
  const inputId = useId()
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleFile(file: File | undefined) {
    if (!file) return
    setBusy(true)
    setError(null)
    try {
      const text = await extractCvText(file)
      onLoaded(text, file.name)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not read that file.')
    } finally {
      setBusy(false)
    }
  }

  const button = dark
    ? 'border-gray-700 bg-gray-800 text-gray-100 hover:bg-gray-700'
    : 'border-gray-300 bg-white text-gray-700 hover:bg-gray-50'

  return (
    <div>
      <label
        htmlFor={inputId}
        className={`inline-flex w-full cursor-pointer items-center justify-center rounded-md border px-3 py-2 text-sm font-medium transition focus-within:ring-2 focus-within:ring-indigo-500 ${button} ${busy ? 'pointer-events-none opacity-60' : ''}`}
      >
        {busy ? 'Reading CV…' : fileName ? 'Replace CV' : 'Upload CV (PDF, Word, text)'}
        <input
          id={inputId}
          type="file"
          accept={CV_ACCEPT}
          className="sr-only"
          onChange={(e) => {
            handleFile(e.target.files?.[0])
            e.target.value = ''
          }}
        />
      </label>
      {fileName && !error && (
        <p className={`mt-1 truncate text-xs ${dark ? 'text-gray-400' : 'text-gray-500'}`}>
          Using: {fileName}
        </p>
      )}
      {error && <p className="mt-1 text-xs text-red-500">{error}</p>}
    </div>
  )
}
