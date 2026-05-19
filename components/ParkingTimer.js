'use client'
import { useState, useEffect, useCallback } from 'react'

const OR = '#ff681f'
const STORAGE_KEY = 'hs-parking-timer'

export function useParkingTimer() {
  const [timer, setTimer] = useState(null)

  // Hydrate from localStorage on mount
  useEffect(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY)
      if (saved) {
        const t = JSON.parse(saved)
        if (t.endsAt > Date.now()) setTimer(t)
        else localStorage.removeItem(STORAGE_KEY)
      }
    } catch {}
  }, [])

  const startTimer = useCallback((durationMins, bayName, bayType) => {
    const t = {
      startedAt: Date.now(),
      endsAt: Date.now() + durationMins * 60 * 1000,
      durationMins,
      bayName,
      bayType,
    }
    localStorage.setItem(STORAGE_KEY, JSON.stringify(t))
    setTimer(t)
  }, [])

  const stopTimer = useCallback(() => {
    localStorage.removeItem(STORAGE_KEY)
    setTimer(null)
  }, [])

  const extendTimer = useCallback((extraMins) => {
    setTimer(prev => {
      if (!prev) return null
      const t = { ...prev, endsAt: prev.endsAt + extraMins * 60 * 1000 }
      localStorage.setItem(STORAGE_KEY, JSON.stringify(t))
      return t
    })
  }, [])

  return { timer, startTimer, stopTimer, extendTimer }
}

function fmt(ms) {
  if (ms <= 0) return '00:00'
  const totalSecs = Math.floor(ms / 1000)
  const h = Math.floor(totalSecs / 3600)
  const m = Math.floor((totalSecs % 3600) / 60)
  const s = totalSecs % 60
  if (h > 0) return `${h}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`
  return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`
}

export default function ParkingTimerWidget({ timer, onStop, onExtend }) {
  const [remaining, setRemaining] = useState(0)

  useEffect(() => {
    if (!timer) return
    const tick = () => setRemaining(Math.max(0, timer.endsAt - Date.now()))
    tick()
    const id = setInterval(tick, 1000)
    return () => clearInterval(id)
  }, [timer])

  if (!timer) return null

  const total = timer.durationMins * 60 * 1000
  const progress = remaining / total
  const isExpired = remaining === 0
  const isWarning = remaining < 10 * 60 * 1000 && !isExpired
  const accentColor = isExpired ? '#e74c3c' : isWarning ? '#FFD700' : '#2ECC71'

  // Circumference of progress ring
  const r = 28
  const circ = 2 * Math.PI * r
  const dash = circ * progress

  return (
    <div style={{
      position: 'absolute',
      top: 'max(100px, calc(env(safe-area-inset-top) + 90px))',
      left: '50%',
      transform: 'translateX(-50%)',
      zIndex: 250,
      background: '#1a1a1a',
      borderRadius: 20,
      padding: '12px 16px',
      display: 'flex',
      alignItems: 'center',
      gap: 14,
      boxShadow: `0 4px 24px rgba(0,0,0,.5), 0 0 0 2px ${accentColor}40`,
      border: `1.5px solid ${accentColor}60`,
      minWidth: 240,
      animation: isWarning || isExpired ? 'timerPulse 1.5s ease infinite' : 'none',
    }}>
      {/* Countdown ring */}
      <div style={{ position: 'relative', width: 64, height: 64, flexShrink: 0 }}>
        <svg width="64" height="64" style={{ transform: 'rotate(-90deg)' }}>
          <circle cx="32" cy="32" r={r} fill="none" stroke="rgba(255,255,255,.1)" strokeWidth="4" />
          <circle
            cx="32" cy="32" r={r} fill="none"
            stroke={accentColor} strokeWidth="4"
            strokeDasharray={`${dash} ${circ}`}
            strokeLinecap="round"
            style={{ transition: 'stroke-dasharray 1s linear, stroke .3s' }}
          />
        </svg>
        <div style={{
          position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column',
          alignItems: 'center', justifyContent: 'center',
        }}>
          <div style={{ fontSize: remaining > 3600000 ? 10 : 13, fontWeight: 700, color: accentColor, lineHeight: 1 }}>
            {isExpired ? '!' : fmt(remaining)}
          </div>
        </div>
      </div>

      {/* Info */}
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: 11, color: 'rgba(255,255,255,.4)', marginBottom: 2 }}>
          {isExpired ? '⚠️ Parking expired!' : isWarning ? '⚠️ Expiring soon' : '🅿️ Parking timer'}
        </div>
        <div style={{ fontSize: 13, fontWeight: 600, color: 'white', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
          {timer.bayName || 'Parking bay'}
        </div>
        <div style={{ display: 'flex', gap: 6, marginTop: 6 }}>
          <button
            onClick={() => onExtend(30)}
            style={{ padding: '3px 10px', borderRadius: 20, border: `1px solid ${OR}60`, background: 'transparent', color: OR, fontSize: 11, fontWeight: 600, cursor: 'pointer' }}>
            +30m
          </button>
          <button
            onClick={onStop}
            style={{ padding: '3px 10px', borderRadius: 20, border: '1px solid rgba(255,255,255,.15)', background: 'transparent', color: 'rgba(255,255,255,.5)', fontSize: 11, cursor: 'pointer' }}>
            Stop
          </button>
        </div>
      </div>
    </div>
  )
}
