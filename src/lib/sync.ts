// Keeps profiles, history and the active profile in the artifact's database,
// under this viewer's private path (data/users/<id>/), so they follow you
// across devices and browsers. Nobody else who opens the page can read them.
//
// Documents in the collection data/users/<id>:
//   settings        { kind: 'settings', activeProfileId }
//   p_<profileId>   { kind: 'profile', order, ...Profile }
//   h_<historyId>   { kind: 'history', ...HistoryEntry }
//
// If the database is unavailable (page opened outside claude.ai), the app
// falls back to this browser's local storage.

import { useAppStore, DEFAULT_PROFILE } from '../store/appStore'
import type { HistoryEntry, Profile } from '../types'
import { useCapability } from './claudeRuntime'

const LOCAL_KEY = 'cover-letter-gen'

type Snapshot = {
  docs: { id: string; data(): Record<string, unknown> | undefined }[]
  empty: boolean
  metadata: { fromCache: boolean }
}

export async function startSync(): Promise<void> {
  const [db, user] = await Promise.all([
    useCapability<any>('db'),
    useCapability<any>('user'),
  ])
  const uid: string | null = user ? await user.id().catch(() => null) : null
  if (!db || !uid) {
    startLocal()
    return
  }

  const col = db.collection(`data/users/${uid}`)
  const profileRef = (id: string) => col.doc(`p_${id}`)
  const historyRef = (id: string) => col.doc(`h_${id}`)
  const settingsRef = col.doc('settings')

  // What the database currently holds, by object identity, so a store change
  // writes only the documents that actually changed.
  let lastProfiles = new Map<string, Profile>()
  let lastHistory = new Map<string, HistoryEntry>()
  let lastActive: string | null = null
  const order = new Map<string, number>()
  let applyingRemote = false
  let ready = false

  // One write at a time keeps documents from racing each other.
  let chain: Promise<void> = Promise.resolve()
  const enqueue = (op: () => Promise<void>) => {
    chain = chain.then(op).catch((e) => console.warn('Save failed', e))
  }

  useAppStore.subscribe((state) => {
    if (!ready || applyingRemote) return

    const nextProfiles = new Map(state.profiles.map((p) => [p.id, p]))
    for (const [id, p] of nextProfiles) {
      if (lastProfiles.get(id) !== p) {
        if (!order.has(id)) order.set(id, Date.now())
        const body = { ...p, kind: 'profile', order: order.get(id) }
        enqueue(() => profileRef(id).set(body))
      }
    }
    for (const id of lastProfiles.keys()) {
      if (!nextProfiles.has(id)) enqueue(() => profileRef(id).delete())
    }
    lastProfiles = nextProfiles

    const nextHistory = new Map(state.history.map((h) => [h.id, h]))
    for (const [id, h] of nextHistory) {
      if (lastHistory.get(id) !== h) {
        const body = { ...h, kind: 'history' }
        enqueue(() => historyRef(id).set(body))
      }
    }
    for (const id of lastHistory.keys()) {
      if (!nextHistory.has(id)) enqueue(() => historyRef(id).delete())
    }
    lastHistory = nextHistory

    if (state.activeProfileId !== lastActive) {
      lastActive = state.activeProfileId
      const body = { kind: 'settings', activeProfileId: lastActive }
      enqueue(() => settingsRef.set(body))
    }
  })

  col.onSnapshot(
    (snap: Snapshot) => {
      // Wait for the server's answer before deciding the store is empty.
      if (!ready && snap.empty && snap.metadata.fromCache) return

      const profiles: Profile[] = []
      const history: HistoryEntry[] = []
      let active: string | null = null
      for (const d of snap.docs) {
        const { kind, order: ord, ...rest } = (d.data() ?? {}) as any
        if (kind === 'profile') {
          profiles.push(rest as Profile)
          if (typeof ord === 'number') order.set(rest.id, ord)
        } else if (kind === 'history') {
          history.push(rest as HistoryEntry)
        } else if (kind === 'settings') {
          active = rest.activeProfileId ?? null
        }
      }
      profiles.sort((a, b) => (order.get(a.id) ?? 0) - (order.get(b.id) ?? 0))
      history.sort((a, b) => b.createdAt.localeCompare(a.createdAt))
      if (!active || !profiles.some((p) => p.id === active)) {
        active = profiles[0]?.id ?? null
      }

      applyingRemote = true
      lastProfiles = new Map(profiles.map((p) => [p.id, p]))
      lastHistory = new Map(history.map((h) => [h.id, h]))
      lastActive = active
      useAppStore.setState({
        profiles,
        history,
        activeProfileId: active,
        storage: 'synced',
      })
      applyingRemote = false

      if (!ready) {
        ready = true
        // First visit: write the starter profile so there is something to use.
        if (profiles.length === 0) {
          useAppStore.setState({
            profiles: [DEFAULT_PROFILE],
            activeProfileId: DEFAULT_PROFILE.id,
          })
        }
      }
    },
    (err: unknown) => {
      console.warn('Sync stopped', err)
    }
  )
}

function startLocal(): void {
  let saved: any = null
  try {
    const raw = localStorage.getItem(LOCAL_KEY)
    saved = raw ? JSON.parse(raw)?.state : null
  } catch {
    saved = null
  }
  const profiles: Profile[] = saved?.profiles?.length
    ? saved.profiles
    : [DEFAULT_PROFILE]
  useAppStore.setState({
    profiles,
    history: saved?.history ?? [],
    activeProfileId: saved?.activeProfileId ?? profiles[0].id,
    storage: 'local',
  })
  useAppStore.subscribe((s) => {
    try {
      localStorage.setItem(
        LOCAL_KEY,
        JSON.stringify({
          state: {
            profiles: s.profiles,
            history: s.history,
            activeProfileId: s.activeProfileId,
          },
        })
      )
    } catch {
      // Storage blocked: changes last for this visit only.
    }
  })
}
