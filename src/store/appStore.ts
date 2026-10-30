import { create } from 'zustand'
import type {
  HistoryEntry,
  JobInput,
  OutputMode,
  Profile,
  ToneOption,
} from '../types'

const emptyJobInput: JobInput = {
  jobTitle: '',
  companyName: '',
  addressTo: '',
  platform: '',
  companyOverview: '',
  jobSummary: '',
  responsibilities: '',
  qualifications: '',
  additionals: '',
}

export const DEFAULT_PROFILE: Profile = {
  id: 'default-ai-pm',
  name: 'AI Automation & PM',
  resumeText: 'Paste your resume and work experience here',
  toolsAndSkills: 'Paste your skills list here',
  portfolioUrl: 'https://cenredportfolio.bizguro.net/portfolio/',
  portfolioProjects: '',
  contactBlock: `CENRED JUN GONZALES
Email: cenredgonzales@gmail.com
Viber: +639078181113
https://www.linkedin.com/in/cenredjgonzales/
Portfolio: https://cenredportfolio.bizguro.net/portfolio/
Resume: https://drive.google.com/file/d/1OgtKpDMjiEwvuutvjWNuN7PdNj8kAQT2/view`,
  specialInstructions: '',
}

// Lightweight unique id generator (no external deps).
export function generateId(): string {
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`
}

interface AppState {
  profiles: Profile[]
  activeProfileId: string | null
  jobInput: JobInput
  tone: ToneOption
  outputMode: OutputMode
  history: HistoryEntry[]
  isGenerating: boolean
  output: string
  // Where profiles and history are kept: loading, the artifact's private
  // database (synced), or this browser only (local).
  storage: 'loading' | 'synced' | 'local'

  addProfile: (profile?: Partial<Profile>) => string
  updateProfile: (id: string, patch: Partial<Profile>) => void
  deleteProfile: (id: string) => void
  setActiveProfile: (id: string | null) => void

  updateJobInput: (patch: Partial<JobInput>) => void
  setTone: (tone: ToneOption) => void
  setOutputMode: (mode: OutputMode) => void
  setOutput: (output: string) => void
  setIsGenerating: (isGenerating: boolean) => void

  addToHistory: (entry: Omit<HistoryEntry, 'id' | 'createdAt'>) => void
  clearHistory: () => void
  deleteHistoryEntry: (id: string) => void
}

export const useAppStore = create<AppState>()((set) => ({
      profiles: [],
      activeProfileId: null,
      jobInput: emptyJobInput,
      tone: 'professional',
      outputMode: 'cover_letter',
      history: [],
      isGenerating: false,
      output: '',
      storage: 'loading',

      addProfile: (profile) => {
        const id = generateId()
        const newProfile: Profile = {
          id,
          name: profile?.name ?? 'New Profile',
          resumeText: profile?.resumeText ?? '',
          toolsAndSkills: profile?.toolsAndSkills ?? '',
          portfolioUrl: profile?.portfolioUrl ?? '',
          portfolioProjects: profile?.portfolioProjects ?? '',
          contactBlock: profile?.contactBlock ?? '',
          specialInstructions: profile?.specialInstructions ?? '',
        }
        set((state) => ({
          profiles: [...state.profiles, newProfile],
          activeProfileId: state.activeProfileId ?? id,
        }))
        return id
      },

      updateProfile: (id, patch) =>
        set((state) => ({
          profiles: state.profiles.map((p) =>
            p.id === id ? { ...p, ...patch } : p
          ),
        })),

      deleteProfile: (id) =>
        set((state) => {
          const profiles = state.profiles.filter((p) => p.id !== id)
          const activeProfileId =
            state.activeProfileId === id
              ? profiles[0]?.id ?? null
              : state.activeProfileId
          return { profiles, activeProfileId }
        }),

      setActiveProfile: (id) => set({ activeProfileId: id }),

      updateJobInput: (patch) =>
        set((state) => ({ jobInput: { ...state.jobInput, ...patch } })),

      setTone: (tone) => set({ tone }),
      setOutputMode: (outputMode) => set({ outputMode }),
      setOutput: (output) => set({ output }),
      setIsGenerating: (isGenerating) => set({ isGenerating }),

      addToHistory: (entry) =>
        set((state) => ({
          history: [
            {
              ...entry,
              id: generateId(),
              createdAt: new Date().toISOString(),
            },
            ...state.history,
          ],
        })),

      clearHistory: () => set({ history: [] }),

      deleteHistoryEntry: (id) =>
        set((state) => ({
          history: state.history.filter((h) => h.id !== id),
        })),
}))
