import { useSyncExternalStore } from 'react'
import { supabase } from './supabase'

const KEY = 'histreets-blocked-businesses-v1'
const EVENT = 'histreets-blocks-changed'
let cachedValue = ''
let cachedIds: string[] = []
export function blockedBusinesses(): string[] {
  let value = ''
  try { value = localStorage.getItem(KEY) || '' } catch { return cachedIds }
  if (value === cachedValue) return cachedIds
  cachedValue = value
  try { const ids = JSON.parse(value); cachedIds = Array.isArray(ids) ? ids.filter(id => typeof id === 'string') : [] }
  catch { cachedIds = [] }
  return cachedIds
}
function subscribe(listener: () => void) {
  window.addEventListener(EVENT, listener)
  window.addEventListener('storage', listener)
  return () => { window.removeEventListener(EVENT, listener); window.removeEventListener('storage', listener) }
}
export function useBlockedBusinesses() { return useSyncExternalStore(subscribe, blockedBusinesses, () => []) }
export function setBusinessBlocked(id: string, blocked: boolean) {
  const ids = new Set(blockedBusinesses())
  if (blocked) ids.add(id); else ids.delete(id)
  localStorage.setItem(KEY, JSON.stringify([...ids]))
  window.dispatchEvent(new Event(EVENT))
}
export type ReportTarget = { kind: 'post' | 'business' | 'ai'; id?: string; label: string; text?: string }
export async function submitContentReport(target: ReportTarget, reason: string, details: string) {
  if (!supabase) throw new Error('Reporting is unavailable. Please try again when connected.')
  const { error } = await supabase.rpc('submit_content_report', {
    p_kind: target.kind, p_target_id: target.id || null,
    p_reason: reason, p_details: details.trim(),
    p_snapshot: target.kind === 'ai' ? (target.text || '').slice(0, 6000) : '',
  })
  if (error) throw new Error('The report was not sent. Check your connection and try again, or contact ahaque@atomicmail.io.')
}
