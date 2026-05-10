'use client'
import { useState } from 'react'
const OR = '#ff681f'
const PANEL = 'rgba(10,10,10,.97)'

function openDirections(lat, lng, name) {
  const enc = encodeURIComponent(name)
  const isIOS = /iPad|iPhone|iPod/.test(navigator?.userAgent || '')
  if (isIOS) window.open(`maps://maps.apple.com/?daddr=${lat},${lng}&q=${enc}`)
  else window.open(`https://www.google.com/maps/dir/?api=1&destination=${lat},${lng}`)
}

function DirectionsPicker({ item, onClose }) {
  const apps = [
    { name:'Google Maps', icon:'🗺️', url:`https://www.google.com/maps/dir/?api=1&destination=${item.lat},${item.lng}` },
    { name:'Apple Maps', icon:'🍎', url:`maps://maps.apple.com/?daddr=${item.lat},${item.lng}` },
    { name:'Waze', icon:'🚗', url:`https://waze.com/ul?ll=${item.lat},${item.lng}&navigate=yes` },
    { name:'Citymapper', icon:'🚌', url:`https://citymapper.com/directions?endcoord=${item.lat},${item.lng}` },
  ]
  return (
    <div style={{ position:'fixed', inset:0, zIndex:1200 }}>
      <div onClick={onClose} style={{ position:'absolute', inset:0, background:'rgba(0,0,0,.7)' }} />
      <div className="slide-up" style={{ position:'absolute', bottom:0, left:0, right:0, background:PANEL, borderRadius:'22px 22px 0 0', padding:'16px 20px 40px', zIndex:1201 }}>
        <div style={{ width:36, height:4, background:'rgba(255,255,255,.2)', borderRadius:2, margin:'0 auto 16px' }} />
        <h3 style={{ fontSize:17, fontWeight:800, marginBottom:20 }}>Open in...</h3>
        <div style={{ display:'flex', flexDirection:'column', gap:10 }}>
          {apps.map(a => (
            <button key={a.name} onClick={() => { window.open(a.url); onClose() }}
              style={{ background:'rgba(255,255,255,.05)', border:'1px solid rgba(255,255,255,.1)', borderRadius:14, padding:'16px 18px', cursor:'pointer', display:'flex', alignItems:'center', gap:14, color:'#fff', textAlign:'left' }}>
              <span style={{ fontSize:26 }}>{a.icon}</span>
              <span style={{ fontSize:16, fontWeight:600 }}>{a.name}</span>
            </button>
          ))}
        </div>
      </div>
    </div>
  )
}

export default function ListViewSheet({ segments, carParks, onSelect, filters, onFilterChange }) {
  const [sort, setSort] = useState('nearest')
  const [dirItem, setDirItem] = useState(null)

  const allItems = [
    ...segments.map(s => ({ ...s, itemType:'segment' })),
    ...(carParks||[]).map(c => ({ ...c, itemType:'carpark' })),
  ]

  const sorted = [...allItems].sort((a,b) => {
    if (sort === 'cheapest') return (a.cost||0) - (b.cost||0)
    if (sort === 'free-first') return (a.type==='free'?0:1) - (b.type==='free'?0:1)
    return 0
  })

  const colors = { free:'#2ECC71', paid:'#4A9EFF', permit:'#9B59B6', restricted:'#888888', loading:'#F39C12', carpark:'#F39C12' }

  return (
    <>
      {dirItem && <DirectionsPicker item={dirItem} onClose={() => setDirItem(null)} />}
      <div style={{ position:'absolute', bottom:0, left:0, right:0, height:'62vh', background:PANEL, backdropFilter:'blur(30px)', borderTop:'1px solid rgba(255,255,255,.08)', borderRadius:'22px 22px 0 0', zIndex:400, display:'flex', flexDirection:'column' }}>
        <div style={{ padding:'14px 20px 0', flexShrink:0 }}>
          <div style={{ width:36, height:4, background:'rgba(255,255,255,.2)', borderRadius:2, margin:'0 auto 12px' }} />
          <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:12 }}>
            <h3 style={{ fontSize:16, fontWeight:800, margin:0 }}>Nearby Parking ({allItems.length})</h3>
            <div style={{ display:'flex', gap:6 }}>
              {[['💸','cheapest'],['🆓','free-first'],['📍','nearest']].map(([ic,id]) => (
                <button key={id} onClick={() => setSort(id)} style={{ background:sort===id?OR:'rgba(255,255,255,.07)', border:'none', borderRadius:8, padding:'6px 10px', cursor:'pointer', fontSize:14, color:'#fff', fontWeight:sort===id?700:400 }}>{ic}</button>
              ))}
            </div>
          </div>
        </div>

        <div style={{ flex:1, overflowY:'auto', padding:'0 20px 24px' }}>
          {sorted.map((item, i) => {
            const c = colors[item.type] || '#4A9EFF'
            const isRestricted = item.type === 'restricted'
            const isCarPark = item.type === 'carpark'
            return (
              <div key={item.id||i} onClick={() => onSelect && onSelect(item)} style={{ background:'rgba(255,255,255,.04)', border:'1px solid rgba(255,255,255,.07)', borderRadius:16, padding:'14px 16px', marginBottom:10, cursor:'pointer', borderLeft:`3px solid ${c}` }}>
                <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start', marginBottom:6 }}>
                  <div>
                    <span style={{ background:c+'22', color:c, borderRadius:8, padding:'3px 8px', fontSize:11, fontWeight:700 }}>
                      {isCarPark ? '🅿️ Car park' : item.label || item.statusLabel}
                    </span>
                    <div style={{ fontSize:14, fontWeight:700, marginTop:6 }}>
                      {isCarPark ? item.name : (item.type === 'free' ? 'Paid bay' : item.type === 'permit' ? 'Resident bay' : item.type === 'restricted' ? 'Double yellow line' : 'Bay')}
                    </div>
                  </div>
                  {!isRestricted && <div style={{ fontSize:14, fontWeight:700, color: item.cost > 0 ? '#4A9EFF' : '#2ECC71' }}>
                    {item.cost > 0 ? '£'+item.cost+'/hr' : 'Free'}
                  </div>}
                </div>

                {item.maxStay && !isRestricted && <div style={{ fontSize:12, color:'rgba(255,255,255,.5)', marginBottom:6 }}>
                  Stay up to {item.maxStay}
                  {item.noReturn && item.noReturn !== 'None' && ` · No return ${item.noReturn}`}
                </div>}

                {item.info && <div style={{ fontSize:12, color:'rgba(255,255,255,.45)', marginBottom:8, lineHeight:1.5 }}>{item.info.slice(0,80)}...</div>}

                {item.address && <div style={{ fontSize:11, color:'rgba(255,255,255,.3)', marginBottom:isRestricted?0:10 }}>📍 {item.address}</div>}

                {!isRestricted && (
                  <button onClick={e => { e.stopPropagation(); setDirItem(item) }}
                    style={{ background:'linear-gradient(135deg,'+OR+',#FF8C00)', border:'none', borderRadius:10, padding:'10px 16px', fontSize:13, fontWeight:700, color:'#fff', cursor:'pointer', boxShadow:'0 3px 12px rgba(255,104,31,.35)', marginTop:4 }}>
                    🧭 Directions
                  </button>
                )}
              </div>
            )
          })}
        </div>
      </div>
    </>
  )
}

export { DirectionsPicker }
