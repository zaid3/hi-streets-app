'use client'
import { useEffect, useState, useRef } from 'react'
import { useRouter } from 'next/navigation'
import dynamic from 'next/dynamic'
import { supabase } from '../../lib/supabase'

const Map = dynamic(() => import('../../components/Map'), { ssr: false })

const CATEGORIES = [
  { id: 'all', label: 'All', icon: '🗺️' },
  { id: 'food', label: 'Food', icon: '🍕' },
  { id: 'retail', label: 'Retail', icon: '🛍️' },
  { id: 'services', label: 'Services', icon: '🔧' },
  { id: 'beauty', label: 'Beauty', icon: '💅' },
  { id: 'health', label: 'Health', icon: '💊' },
]

export default function MapPage() {
  const router = useRouter()
  const [offers, setOffers] = useState([])
  const [selectedOffer, setSelectedOffer] = useState(null)
  const [filter, setFilter] = useState('all')
  const [search, setSearch] = useState('')
  const [loading, setLoading] = useState(true)
  const [newOfferIds, setNewOfferIds] = useState([])
  const [userLocation, setUserLocation] = useState({ lat: 51.5074, lng: -0.1278 })
  const [showSearch, setShowSearch] = useState(false)
  const [user, setUser] = useState(null)
  const [toast, setToast] = useState(null)

  useEffect(() => {
    // Auth check
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!session) { router.replace('/login'); return }
      setUser(session.user)
    })

    // Get location
    navigator.geolocation?.getCurrentPosition(
      pos => setUserLocation({ lat: pos.coords.latitude, lng: pos.coords.longitude }),
      () => {}
    )

    fetchOffers()

    // Real-time subscription
    const channel = supabase
      .channel('offers-realtime')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'offers' }, payload => {
        const newOffer = payload.new
        setOffers(prev => [newOffer, ...prev])
        setNewOfferIds(prev => [...prev, newOffer.id])
        showToast(`🎉 New offer: ${newOffer.title}`)
        // Remove pulse after 8 seconds
        setTimeout(() => setNewOfferIds(prev => prev.filter(id => id !== newOffer.id)), 8000)
      })
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'offers' }, () => fetchOffers())
      .on('postgres_changes', { event: 'DELETE', schema: 'public', table: 'offers' }, payload => {
        setOffers(prev => prev.filter(o => o.id !== payload.old.id))
      })
      .subscribe()

    return () => supabase.removeChannel(channel)
  }, [])

  function showToast(msg) {
    setToast(msg)
    setTimeout(() => setToast(null), 4000)
  }

  async function fetchOffers() {
    setLoading(true)
    const { data } = await supabase
      .from('offers')
      .select('*, businesses(name, whatsapp_number)')
      .eq('is_active', true)
      .gt('expires_at', new Date().toISOString())
      .order('created_at', { ascending: false })
    setOffers(data || [])
    setLoading(false)
  }

  const filtered = offers.filter(o => {
    const matchCat = filter === 'all' || o.category === filter
    const matchSearch = !search || o.title?.toLowerCase().includes(search.toLowerCase()) ||
      o.description?.toLowerCase().includes(search.toLowerCase()) ||
      o.address?.toLowerCase().includes(search.toLowerCase())
    return matchCat && matchSearch
  })

  function timeLeft(expiresAt) {
    const diff = new Date(expiresAt) - new Date()
    if (diff < 0) return 'Expired'
    const hours = Math.floor(diff / 3600000)
    const mins = Math.floor((diff % 3600000) / 60000)
    if (hours > 0) return `${hours}h ${mins}m left`
    return `${mins}m left`
  }

  return (
    <div style={{ height: '100vh', display: 'flex', flexDirection: 'column', background: '#0a0a0a', overflow: 'hidden' }}>

      {/* Header */}
      <div style={{
        position: 'absolute', top: 0, left: 0, right: 0, zIndex: 1000,
        padding: '12px 16px 0',
        pointerEvents: 'none',
      }}>
        {/* Top bar */}
        <div style={{
          display: 'flex', alignItems: 'center', gap: '10px',
          marginBottom: '10px', pointerEvents: 'all',
        }}>
          {/* Logo */}
          <div style={{
            background: 'linear-gradient(135deg, #FF6B35, #FF8C00)',
            borderRadius: '14px', padding: '8px 14px',
            display: 'flex', alignItems: 'center', gap: '8px',
            boxShadow: '0 4px 20px rgba(255,107,53,0.4)',
          }}>
            <span style={{ fontSize: '18px' }}>🏪</span>
            <span style={{ color: 'white', fontWeight: 800, fontSize: '16px', letterSpacing: '-0.5px' }}>Hi-Streets</span>
          </div>

          {/* Search bar */}
          <div style={{
            flex: 1,
            background: 'rgba(20,20,20,0.92)',
            backdropFilter: 'blur(20px)',
            border: '1px solid rgba(255,255,255,0.12)',
            borderRadius: '14px',
            display: 'flex', alignItems: 'center',
            padding: '10px 14px', gap: '8px',
            boxShadow: '0 4px 20px rgba(0,0,0,0.4)',
          }}>
            <span style={{ fontSize: '16px', opacity: 0.6 }}>🔍</span>
            <input
              placeholder="Search offers..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              style={{
                background: 'none', border: 'none', outline: 'none',
                color: 'white', fontSize: '14px', flex: 1,
              }}
            />
            {search && (
              <button onClick={() => setSearch('')} style={{ background: 'none', border: 'none', color: 'rgba(255,255,255,0.5)', cursor: 'pointer', fontSize: '16px' }}>✕</button>
            )}
          </div>

          {/* Profile */}
          <button
            onClick={() => supabase.auth.signOut().then(() => router.replace('/login'))}
            style={{
              width: 44, height: 44,
              background: 'rgba(20,20,20,0.92)',
              backdropFilter: 'blur(20px)',
              border: '1px solid rgba(255,255,255,0.12)',
              borderRadius: '14px', cursor: 'pointer',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: '18px',
            }}
            title="Sign out"
          >👤</button>
        </div>

        {/* Category filters */}
        <div style={{
          display: 'flex', gap: '8px', overflowX: 'auto',
          paddingBottom: '4px', pointerEvents: 'all',
        }}>
          {CATEGORIES.map(cat => (
            <button
              key={cat.id}
              onClick={() => setFilter(cat.id)}
              style={{
                padding: '8px 14px',
                borderRadius: '20px', border: 'none',
                whiteSpace: 'nowrap', fontSize: '13px', fontWeight: 600,
                cursor: 'pointer', transition: 'all 0.2s',
                background: filter === cat.id
                  ? 'linear-gradient(135deg, #FF6B35, #FF8C00)'
                  : 'rgba(20,20,20,0.92)',
                backdropFilter: 'blur(20px)',
                color: 'white',
                border: filter === cat.id ? 'none' : '1px solid rgba(255,255,255,0.12)',
                boxShadow: filter === cat.id ? '0 4px 12px rgba(255,107,53,0.4)' : '0 2px 8px rgba(0,0,0,0.3)',
              }}
            >
              {cat.icon} {cat.label}
            </button>
          ))}
        </div>
      </div>

      {/* Map */}
      <div style={{ flex: 1, position: 'relative' }}>
        <Map
          offers={filtered}
          center={userLocation}
          onOfferClick={setSelectedOffer}
          newOfferIds={newOfferIds}
        />

        {/* Stats pill */}
        <div style={{
          position: 'absolute', bottom: selectedOffer ? '260px' : '24px',
          left: '50%', transform: 'translateX(-50%)',
          background: 'rgba(20,20,20,0.92)',
          backdropFilter: 'blur(20px)',
          border: '1px solid rgba(255,255,255,0.12)',
          borderRadius: '20px', padding: '8px 16px',
          display: 'flex', gap: '16px', alignItems: 'center',
          zIndex: 999, transition: 'bottom 0.3s ease',
          boxShadow: '0 4px 20px rgba(0,0,0,0.4)',
        }}>
          <span style={{ fontSize: '13px', color: 'rgba(255,255,255,0.7)' }}>
            🔴 <strong style={{ color: 'white' }}>{filtered.length}</strong> live offers
          </span>
          <div style={{ width: 1, height: 16, background: 'rgba(255,255,255,0.15)' }} />
          <span style={{ fontSize: '13px', color: 'rgba(255,255,255,0.7)' }}>
            🅿️ Parking visible
          </span>
        </div>

        {/* Toast notification */}
        {toast && (
          <div style={{
            position: 'absolute', top: '110px', left: '50%', transform: 'translateX(-50%)',
            background: 'linear-gradient(135deg, #FF6B35, #FF8C00)',
            color: 'white', borderRadius: '20px', padding: '10px 20px',
            fontSize: '14px', fontWeight: 600, zIndex: 1001,
            animation: 'slideDown 0.3s ease',
            boxShadow: '0 4px 20px rgba(255,107,53,0.5)',
            whiteSpace: 'nowrap',
          }}>
            {toast}
          </div>
        )}

        {/* Offer detail card */}
        {selectedOffer && (
          <div style={{
            position: 'absolute', bottom: 0, left: 0, right: 0,
            background: 'rgba(15,15,15,0.98)',
            backdropFilter: 'blur(30px)',
            borderTop: '1px solid rgba(255,255,255,0.1)',
            borderRadius: '24px 24px 0 0',
            padding: '20px 20px 32px',
            zIndex: 1000,
            animation: 'slideUp 0.35s cubic-bezier(0.34,1.56,0.64,1)',
          }}>
            {/* Handle */}
            <div style={{
              width: 40, height: 4, background: 'rgba(255,255,255,0.2)',
              borderRadius: 2, margin: '0 auto 16px',
            }} />

            <button
              onClick={() => setSelectedOffer(null)}
              style={{
                position: 'absolute', top: '16px', right: '20px',
                background: 'rgba(255,255,255,0.1)', border: 'none',
                width: 32, height: 32, borderRadius: '50%',
                color: 'white', cursor: 'pointer', fontSize: '14px',
              }}
            >✕</button>

            <div style={{ display: 'flex', gap: '14px', alignItems: 'flex-start' }}>
              <div style={{
                width: 56, height: 56, borderRadius: '16px',
                background: 'rgba(255,107,53,0.15)',
                border: '1px solid rgba(255,107,53,0.3)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: '26px', flexShrink: 0,
              }}>
                {selectedOffer.category === 'food' ? '🍕' :
                 selectedOffer.category === 'retail' ? '🛍️' :
                 selectedOffer.category === 'beauty' ? '💅' :
                 selectedOffer.category === 'health' ? '💊' :
                 selectedOffer.category === 'services' ? '🔧' : '🏪'}
              </div>
              <div style={{ flex: 1 }}>
                <h3 style={{ fontSize: '18px', fontWeight: 700, marginBottom: '4px', color: 'white' }}>
                  {selectedOffer.title}
                </h3>
                <p style={{ fontSize: '13px', color: 'rgba(255,255,255,0.5)' }}>
                  {selectedOffer.businesses?.name}
                </p>
              </div>
            </div>

            <div style={{ display: 'flex', gap: '8px', marginTop: '14px', flexWrap: 'wrap' }}>
              {selectedOffer.price_offer && (
                <span style={{
                  background: 'rgba(255,107,53,0.15)', color: '#FF6B35',
                  border: '1px solid rgba(255,107,53,0.3)',
                  borderRadius: '10px', padding: '6px 12px',
                  fontSize: '14px', fontWeight: 700,
                }}>
                  {selectedOffer.price_offer}
                </span>
              )}
              {selectedOffer.expires_at && (
                <span style={{
                  background: 'rgba(255,255,255,0.07)',
                  border: '1px solid rgba(255,255,255,0.1)',
                  borderRadius: '10px', padding: '6px 12px',
                  fontSize: '13px', color: 'rgba(255,255,255,0.6)',
                }}>
                  ⏱ {timeLeft(selectedOffer.expires_at)}
                </span>
              )}
            </div>

            {selectedOffer.description && (
              <p style={{ fontSize: '14px', color: 'rgba(255,255,255,0.6)', marginTop: '12px', lineHeight: 1.5 }}>
                {selectedOffer.description}
              </p>
            )}

            {selectedOffer.address && (
              <div style={{
                display: 'flex', alignItems: 'center', gap: '8px',
                marginTop: '12px', fontSize: '13px', color: 'rgba(255,255,255,0.4)',
              }}>
                <span>📍</span> {selectedOffer.address}
              </div>
            )}
          </div>
        )}

        {/* Empty state */}
        {!loading && filtered.length === 0 && (
          <div style={{
            position: 'absolute', top: '50%', left: '50%',
            transform: 'translate(-50%, -50%)',
            background: 'rgba(15,15,15,0.95)',
            backdropFilter: 'blur(20px)',
            border: '1px solid rgba(255,255,255,0.1)',
            borderRadius: '20px', padding: '28px 32px',
            textAlign: 'center', zIndex: 999,
          }}>
            <div style={{ fontSize: '48px', marginBottom: '12px' }}>🏪</div>
            <div style={{ fontWeight: 700, fontSize: '16px', marginBottom: '6px' }}>No offers nearby</div>
            <div style={{ fontSize: '13px', color: 'rgba(255,255,255,0.4)' }}>
              Businesses can list offers via WhatsApp
            </div>
          </div>
        )}
      </div>

      <style>{`
        @keyframes slideUp { from{transform:translateY(100%);opacity:0} to{transform:translateY(0);opacity:1} }
        @keyframes slideDown { from{transform:translate(-50%,-10px);opacity:0} to{transform:translate(-50%,0);opacity:1} }
      `}</style>
    </div>
  )
}
