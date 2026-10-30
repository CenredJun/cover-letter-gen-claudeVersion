import { useState } from 'react'
import { useAppStore } from './store/appStore'
import ProfileManager from './components/ProfileManager'
import JobDescriptionInput from './components/JobDescriptionInput'
import GeneratorControls from './components/GeneratorControls'
import OutputPanel from './components/OutputPanel'
import HistoryPanel from './components/HistoryPanel'
import CvUpload from './components/CvUpload'

export default function App() {
  const profiles = useAppStore((s) => s.profiles)
  const activeProfileId = useAppStore((s) => s.activeProfileId)
  const setActiveProfile = useAppStore((s) => s.setActiveProfile)
  const updateProfile = useAppStore((s) => s.updateProfile)
  const activeProfile = profiles.find((p) => p.id === activeProfileId)

  const storage = useAppStore((s) => s.storage)

  const [managerOpen, setManagerOpen] = useState(false)

  return (
    <div className="flex min-h-full flex-col bg-gray-100 md:h-full md:flex-row">
      {/* Sidebar */}
      <aside className="flex w-full flex-col gap-5 bg-gray-900 p-5 text-gray-100 md:h-full md:w-[280px] md:shrink-0">
        <div>
          <h1 className="text-xl font-bold leading-tight">
            Cover Letter
            <br />
            Generator
          </h1>
        </div>

        <div>
          <label
            htmlFor="profile-switcher"
            className="mb-1 block text-sm font-semibold uppercase tracking-wide text-gray-400"
          >
            Active Profile
          </label>
          <select
            id="profile-switcher"
            value={activeProfileId ?? ''}
            onChange={(e) => setActiveProfile(e.target.value || null)}
            className="w-full rounded-md border border-gray-700 bg-gray-800 p-2 text-sm text-gray-100 outline-none focus:border-indigo-500"
          >
            {profiles.length === 0 && (
              <option value="">
                {storage === 'loading' ? 'Loading…' : 'No profiles'}
              </option>
            )}
            {profiles.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name}
              </option>
            ))}
          </select>
          <button
            type="button"
            onClick={() => setManagerOpen(true)}
            className="mt-2 w-full rounded-md border border-gray-700 bg-gray-800 px-3 py-2 text-sm font-medium text-gray-100 transition hover:bg-gray-700"
          >
            Manage Profiles
          </button>
          {activeProfile && (
            <div className="mt-2">
              <CvUpload
                dark
                fileName={activeProfile.cvFileName}
                onLoaded={(text, fileName) =>
                  updateProfile(activeProfile.id, {
                    resumeText: text,
                    cvFileName: fileName,
                  })
                }
              />
            </div>
          )}
        </div>

        <HistoryPanel />

        <p className="text-[11px] leading-snug text-gray-500">
          {storage === 'synced' &&
            'Profiles and history are saved privately to your Claude account.'}
          {storage === 'local' &&
            'Saved in this browser only. Open this page in claude.ai to sync across devices.'}
          {storage === 'loading' && 'Loading your profiles…'}
        </p>
      </aside>

      {/* Main content */}
      <main className="flex-1 overflow-y-auto p-5 md:h-full">
        <div className="mx-auto flex max-w-3xl flex-col gap-5">
          <JobDescriptionInput />
          <GeneratorControls />
          <OutputPanel />
        </div>
      </main>

      {managerOpen && <ProfileManager onClose={() => setManagerOpen(false)} />}
    </div>
  )
}
