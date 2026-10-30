import { useState } from 'react'
import { useAppStore } from '../store/appStore'
import type { Profile } from '../types'
import CvUpload from './CvUpload'

interface ProfileManagerProps {
  onClose: () => void
}

type Draft = Omit<Profile, 'id'> & { id: string | null }

const emptyDraft: Draft = {
  id: null,
  name: '',
  resumeText: '',
  toolsAndSkills: '',
  portfolioUrl: '',
  portfolioProjects: '',
  contactBlock: '',
  specialInstructions: '',
}

export default function ProfileManager({ onClose }: ProfileManagerProps) {
  const profiles = useAppStore((s) => s.profiles)
  const addProfile = useAppStore((s) => s.addProfile)
  const updateProfile = useAppStore((s) => s.updateProfile)
  const deleteProfile = useAppStore((s) => s.deleteProfile)
  const setActiveProfile = useAppStore((s) => s.setActiveProfile)

  const [draft, setDraft] = useState<Draft | null>(null)

  function startNew() {
    setDraft({ ...emptyDraft })
  }

  function startEdit(profile: Profile) {
    setDraft({ ...profile })
  }

  function handleSave() {
    if (!draft) return
    const payload = {
      name: draft.name.trim() || 'Untitled Profile',
      resumeText: draft.resumeText,
      toolsAndSkills: draft.toolsAndSkills,
      portfolioUrl: draft.portfolioUrl,
      portfolioProjects: draft.portfolioProjects,
      contactBlock: draft.contactBlock,
      specialInstructions: draft.specialInstructions,
      cvFileName: draft.cvFileName,
    }
    if (draft.id) {
      updateProfile(draft.id, payload)
    } else {
      const id = addProfile(payload)
      setActiveProfile(id)
    }
    setDraft(null)
  }

  function handleDelete(id: string) {
    deleteProfile(id)
    if (draft?.id === id) setDraft(null)
  }

  const field = (key: keyof Omit<Draft, 'id'>, value: string) =>
    setDraft((d) => (d ? { ...d, [key]: value } : d))

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
      onClick={onClose}
    >
      <div
        className="flex max-h-[90vh] w-full max-w-2xl flex-col overflow-hidden rounded-lg bg-white shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        <header className="flex items-center justify-between border-b border-gray-200 px-5 py-4">
          <h2 className="text-lg font-semibold text-gray-800">
            Manage Profiles
          </h2>
          <button
            type="button"
            onClick={onClose}
            className="rounded-md p-1 text-gray-400 hover:bg-gray-100 hover:text-gray-700"
            aria-label="Close"
          >
            ✕
          </button>
        </header>

        <div className="flex-1 overflow-y-auto p-5">
          {!draft ? (
            <>
              <button
                type="button"
                onClick={startNew}
                className="mb-4 rounded-md bg-indigo-600 px-4 py-2 text-sm font-medium text-white transition hover:bg-indigo-700"
              >
                + Add new profile
              </button>

              {profiles.length === 0 ? (
                <p className="text-sm text-gray-500">No profiles yet.</p>
              ) : (
                <ul className="space-y-2">
                  {profiles.map((p) => (
                    <li
                      key={p.id}
                      className="flex items-center justify-between rounded-md border border-gray-200 px-4 py-3"
                    >
                      <span className="text-sm font-medium text-gray-800">
                        {p.name}
                      </span>
                      <div className="flex gap-2">
                        <button
                          type="button"
                          onClick={() => startEdit(p)}
                          className="rounded-md border border-gray-300 px-3 py-1 text-xs font-medium text-gray-700 hover:bg-gray-50"
                        >
                          Edit
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDelete(p.id)}
                          className="rounded-md border border-red-200 px-3 py-1 text-xs font-medium text-red-600 hover:bg-red-50"
                        >
                          Delete
                        </button>
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </>
          ) : (
            <div className="space-y-4">
              <div>
                <label className="mb-1 block text-sm font-medium text-gray-600">
                  Profile name
                </label>
                <input
                  type="text"
                  value={draft.name}
                  onChange={(e) => field('name', e.target.value)}
                  placeholder='e.g. "AI Automation Role"'
                  className="w-full rounded-md border border-gray-300 p-2 text-sm outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
                />
              </div>

              <div>
                <label className="mb-1 block text-sm font-medium text-gray-600">
                  Master CV / Resume &amp; Experience
                </label>
                <div className="mb-2">
                  <CvUpload
                    fileName={draft.cvFileName}
                    onLoaded={(text, fileName) =>
                      setDraft((d) =>
                        d ? { ...d, resumeText: text, cvFileName: fileName } : d
                      )
                    }
                  />
                </div>
                <textarea
                  value={draft.resumeText}
                  placeholder="Upload your CV above, or paste it here. Tailored CVs only use facts from this text."
                  onChange={(e) => field('resumeText', e.target.value)}
                  rows={10}
                  className="w-full resize-y rounded-md border border-gray-300 p-2 text-sm outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
                />
              </div>

              <div>
                <label className="mb-1 block text-sm font-medium text-gray-600">
                  Tools &amp; Skills
                </label>
                <textarea
                  value={draft.toolsAndSkills}
                  onChange={(e) => field('toolsAndSkills', e.target.value)}
                  rows={4}
                  className="w-full resize-y rounded-md border border-gray-300 p-2 text-sm outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
                />
              </div>

              <div>
                <label className="mb-1 block text-sm font-medium text-gray-600">
                  Portfolio URL
                </label>
                <input
                  type="text"
                  value={draft.portfolioUrl}
                  onChange={(e) => field('portfolioUrl', e.target.value)}
                  className="w-full rounded-md border border-gray-300 p-2 text-sm outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
                />
              </div>

              <div>
                <label className="mb-1 block text-sm font-medium text-gray-600">
                  Portfolio projects
                </label>
                <textarea
                  value={draft.portfolioProjects}
                  onChange={(e) => field('portfolioProjects', e.target.value)}
                  rows={6}
                  placeholder="List your key portfolio projects with titles, outcomes, and links. Claude will reference these when relevant to the job description."
                  className="w-full resize-y rounded-md border border-gray-300 p-2 text-sm outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
                />
              </div>

              <div>
                <label className="mb-1 block text-sm font-medium text-gray-600">
                  Contact block
                </label>
                <textarea
                  value={draft.contactBlock}
                  onChange={(e) => field('contactBlock', e.target.value)}
                  rows={6}
                  placeholder="Name, email, phone, LinkedIn, resume link"
                  className="w-full resize-y rounded-md border border-gray-300 p-2 text-sm outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
                />
              </div>

              <div>
                <label className="mb-1 block text-sm font-medium text-gray-600">
                  Special instructions
                </label>
                <textarea
                  value={draft.specialInstructions}
                  onChange={(e) => field('specialInstructions', e.target.value)}
                  rows={6}
                  placeholder={`Additional rules for this profile. Examples:
- Do not mention my previous employer by name
- Emphasize I am seeking a long-term full-time role
- I am open to relocation
- Do not mention salary expectations
- Emphasize my Philippine market experience`}
                  className="w-full resize-y rounded-md border border-gray-300 p-2 text-sm outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
                />
              </div>

              <div className="flex gap-2 pt-2">
                <button
                  type="button"
                  onClick={handleSave}
                  className="rounded-md bg-indigo-600 px-5 py-2 text-sm font-medium text-white transition hover:bg-indigo-700"
                >
                  Save
                </button>
                <button
                  type="button"
                  onClick={() => setDraft(null)}
                  className="rounded-md border border-gray-300 px-5 py-2 text-sm font-medium text-gray-700 transition hover:bg-gray-50"
                >
                  Cancel
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
