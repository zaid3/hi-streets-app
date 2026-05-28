'use client'

function parkingPoint(segment){
  const lat=segment?.lat||segment?.coords?.[0]?.[0]
  const lng=segment?.lng||segment?.coords?.[0]?.[1]
  return{lat,lng}
}
function meta(segment){
  const type=segment?.isCarPark?'carpark':segment?.type
  if(type==='free')return{status:'Free guidance',tone:'green',icon:'✓',type:'Free / short stay'}
  if(type==='paid'||type==='carpark')return{status:type==='carpark'?'Car park':'Paid parking',tone:'blue',icon:type==='carpark'?'P':'£',type:type==='carpark'?'Off-street car park':'Paid bay / zone'}
  if(type==='restricted'||type==='no_parking')return{status:'No parking / restricted',tone:'red',icon:'!',type:'Restriction warning'}
  return{status:'Check signs',tone:'grey',icon:'?',type:'Parking guidance'}
}
function sourceText(segment){
  const source=segment?.source||'unknown'
  const confidence=segment?.confidence||source
  if(source==='official'||confidence==='official')return'Official / verified geometry'
  if(source==='osm')return'OpenStreetMap guidance'
  if(source==='seed')return'Hi-Streets seed guidance'
  if(source==='user_reported')return'Community report'
  return'Unverified guidance'
}

export default function ParkingSheet({segment,onClose,onDirections}){
  if(!segment)return null
  const m=meta(segment)
  const p=parkingPoint(segment)
  return(
    <div className="premium-sheet open parking-detail-sheet">
      <div className="sheet-grabber"/>
      <div className="sheet-topline">
        <div className={`sheet-icon ${m.tone}`}>{m.icon}</div>
        <div className="sheet-title-block">
          <div className="eyebrow">Parking guidance</div>
          <h2>{m.status}</h2>
          <p>{segment.name||'Nearby parking'}</p>
        </div>
        <button className="round-close" onClick={onClose} aria-label="Close parking details">✕</button>
      </div>

      <div className="parking-disclaimer">Always check local signs before parking. Hi-Streets does not claim exact bay accuracy unless data is official or verified.</div>

      <div className="detail-grid two">
        <div><span>Status</span><strong>{m.status}</strong></div>
        <div><span>Type</span><strong>{m.type}</strong></div>
        <div><span>Source</span><strong>{sourceText(segment)}</strong></div>
        <div><span>Confidence</span><strong>{segment.confidence||'unknown'}</strong></div>
      </div>

      <div className="info-card">
        <span>Restriction</span>
        <strong>{segment.restriction||'Check signs at the location'}</strong>
        {segment.hours&&<small>{segment.hours}</small>}
      </div>

      <div className="sheet-actions">
        <button className="primary-action blue" onClick={()=>onDirections?.(segment)}>Directions</button>
        <button className="secondary-action" onClick={onClose}>Back to map</button>
      </div>
      {p.lat&&p.lng&&<p className="tiny-note">Approximate point: {p.lat.toFixed(4)}, {p.lng.toFixed(4)}</p>}
    </div>
  )
}
