'use client'

// Single source of truth for "which listings has the current user saved".
// Shared by listing cards (/, /tim-kiem), the room detail page and the
// "Tin đã lưu" page, so a heart toggled anywhere shows the same state
// everywhere and survives reloads (it is loaded from the backend).

import { useCallback, useEffect, useSyncExternalStore } from 'react'
import { tenantApi } from '@/lib/api'
import { useAuth } from '@/components/auth-provider'

type Snapshot = { ids: ReadonlySet<string>; loaded: boolean }

let snapshot: Snapshot = { ids: new Set(), loaded: false }
let loadedFor: string | null = null // user id the ids belong to
let inflight: Promise<void> | null = null
const listeners = new Set<() => void>()

function emit(next: Snapshot) {
  snapshot = next
  listeners.forEach((l) => l())
}

function subscribe(listener: () => void) {
  listeners.add(listener)
  return () => listeners.delete(listener)
}

const getSnapshot = () => snapshot
const EMPTY: Snapshot = { ids: new Set(), loaded: false }
const getServerSnapshot = () => EMPTY

/** Load saved ids for `userId` (once; pass force to refetch). */
export function loadSavedIds(userId: string, force = false): Promise<void> {
  if (!force && loadedFor === userId && (snapshot.loaded || inflight)) return inflight ?? Promise.resolve()
  loadedFor = userId
  inflight = tenantApi
    .getSaved()
    .then((res) => {
      if (loadedFor !== userId) return
      emit({ ids: new Set((res.listings ?? []).map((l: any) => String(l.id))), loaded: true })
    })
    .catch((err) => {
      console.error('[saved] load failed:', err)
      if (loadedFor === userId) emit({ ...snapshot, loaded: true })
    })
    .finally(() => {
      inflight = null
    })
  return inflight
}

/** Overwrite the ids from a full list we already have (e.g. the saved page). */
export function setSavedIds(ids: string[]) {
  emit({ ids: new Set(ids.map(String)), loaded: true })
}

function setOne(id: string, saved: boolean) {
  const ids = new Set(snapshot.ids)
  if (saved) ids.add(id)
  else ids.delete(id)
  emit({ ...snapshot, ids })
}

export async function saveListing(id: string) {
  id = String(id)
  setOne(id, true) // optimistic
  try {
    await tenantApi.saveListing(id)
  } catch (err: any) {
    if (err?.status === 409) return // already saved on the server
    setOne(id, false)
    throw err
  }
}

export async function unsaveListing(id: string) {
  id = String(id)
  setOne(id, false) // optimistic
  try {
    await tenantApi.unsaveListing(id)
  } catch (err) {
    setOne(id, true)
    throw err
  }
}

function clear() {
  loadedFor = null
  inflight = null
  emit({ ids: new Set(), loaded: false })
}

/** Saved state for the signed-in user. Loads from the backend on first use. */
export function useSavedListings() {
  const { user } = useAuth()
  const userId = user?.id ? String(user.id) : null
  const snap = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot)

  useEffect(() => {
    if (userId) loadSavedIds(userId)
    else if (loadedFor) clear() // logged out / switched account
  }, [userId])

  const isSaved = useCallback((id: string | number) => snap.ids.has(String(id)), [snap])

  const toggle = useCallback(
    async (id: string | number) => {
      const key = String(id)
      if (snapshot.ids.has(key)) await unsaveListing(key)
      else await saveListing(key)
    },
    []
  )

  return { isSaved, toggle, loaded: snap.loaded, count: snap.ids.size, signedIn: !!userId }
}
