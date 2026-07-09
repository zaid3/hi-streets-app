'use client'
import{useCallback,useEffect,useRef,useState}from'react'
import dynamic from'next/dynamic'
import{getParkingData}from'../../lib/parkingAdapter'
import{getLiveOffers,subscribeToOffers}from'../../lib/offersAdapter'
import{getPlacesData}from'../../lib/placesAdapter'
import{NEWHAM_CENTER,NEWHAM_BOUNDS,boundsAround,clampToNewham,newhamPlaces}from'../../lib/newhamSeedData'
import ParkingSheet from'../../components/ParkingSheet'
import OfferSheet from'../../components/OfferSheet'
import SearchOverlay from'../../components/SearchOverlay'

const MapLibreMap=dynamic(()=>import('../../components/MapLibreMap'),{ssr:false})
const LEGEND=[['free','#078d16','Free / permit'],['paid','#0b73d9','Paid / car park'],['disabled','#8E44AD','Blue badge'],['loading','#ff681f','Loading'],['no','#9d9da5','No parking']]
function countLines(items){return items.filter(s=>Array.isArray(s.coords)&&s.coords.length>1).length}
function uniqueById(items){const seen=new Set();return items.filter(item=>{const id=item.id||item.external_id||`${item.lat},${item.lng}`;if(seen.has(id))return false;seen.add(id);return true})}
function newhamBoundsAround(center){const b=boundsAround(clampToNewham(center),0.022);return{south:Math.max(b.south,NEWHAM_BOUNDS.south),west:Math.max(b.west,NEWHAM_BOUNDS.west),north:Math.min(b.north,NEWHAM_BOUNDS.north),east:Math.min(b.east,NEWHAM_BOUNDS.east)}}
function Header({onSearch,parkingCount,lineCount,offersCount}){return <div className="newham-top"><button onClick={onSearch} className="newham-search"><span>⌕</span><b>Search Newham road or postcode</b></button><div className="newham-status"><b>{lineCount}</b> road lines · <b>{parkingCount}</b> parking places · <b>{offersCount}</b> offers</div></div>}
function Legend(){return <div className="newham-legend">{LEGEND.map(([id,color,label])=><div key={id} className="legend-pill"><span style={{background:color}}/>{label}</div>)}</div>}
function EmptyNote({count}){if(count)return null;return <div className="coverage-note"><b>Newham map only.</b> Official bay lines appear only where D-TRO, council or OpenStreetMap parking geometry exists. Car parks and local points are shown as P signs.</div>}
export default function MapPage(){
  const[center,setCenter]=useState(NEWHAM_CENTER)
  const[zoom,setZoom]=useState(14)
  const[segments,setSegments]=useState([])
  const[offers,setOffers]=useState([])
  const[places,setPlaces]=useState(newhamPlaces)
  const[selectedSeg,setSelectedSeg]=useState(null)
  const[selectedOffer,setSelectedOffer]=useState(null)
  const[showSearch,setShowSearch]=useState(false)
  const loadTimer=useRef(null)
  const handleBoundsChange=useCallback(async(bounds)=>{clearTimeout(loadTimer.current);loadTimer.current=setTimeout(async()=>{try{const scoped={south:Math.max(bounds.south,NEWHAM_BOUNDS.south),west:Math.max(bounds.west,NEWHAM_BOUNDS.west),north:Math.min(bounds.north,NEWHAM_BOUNDS.north),east:Math.min(bounds.east,NEWHAM_BOUNDS.east)};const[parking,poi]=await Promise.all([getParkingData(scoped),getPlacesData(scoped)]);setSegments(uniqueById(parking));setPlaces(poi.length?poi:newhamPlaces)}catch(e){console.error(e)}},360)},[])
  useEffect(()=>{handleBoundsChange(newhamBoundsAround(NEWHAM_CENTER));getLiveOffers().then(setOffers);const unsub=subscribeToOffers(setOffers);return()=>{clearTimeout(loadTimer.current);unsub?.()}},[handleBoundsChange])
  const selectSeg=useCallback((seg)=>{const lat=seg.lat||seg.coords?.[0]?.[0],lng=seg.lng||seg.coords?.[0]?.[1];if(lat&&lng){setCenter(clampToNewham({lat,lng}));setZoom(17)}setSelectedOffer(null);setSelectedSeg(seg)},[])
  function handleDirections(item){const lat=item.lat||item.coords?.[0]?.[0],lng=item.lng||item.coords?.[0]?.[1];if(lat&&lng)window.open(`https://maps.google.com/?q=${lat},${lng}`,'_blank')}
  const lineCount=countLines(segments)
  return <div className="newham-map-shell"><style jsx global>{`
    .newham-map-shell{position:relative;width:100vw;height:100dvh;overflow:hidden;background:#eef2ee;color:#0b0628;font-family:-apple-system,BlinkMacSystemFont,'Inter','Segoe UI',Arial,sans-serif}
    .newham-top{position:absolute;top:0;left:0;right:0;z-index:320;padding:max(12px,env(safe-area-inset-top)) 14px 10px;background:linear-gradient(180deg,rgba(247,246,252,.98),rgba(247,246,252,.82),rgba(247,246,252,0));display:flex;flex-direction:column;align-items:center;gap:8px;pointer-events:none}
    .newham-search{pointer-events:all;width:min(460px,calc(100vw - 28px));height:56px;border:1px solid #e5e1ef;background:#fff;border-radius:14px;box-shadow:0 8px 24px rgba(25,20,55,.12);display:flex;align-items:center;gap:12px;padding:0 15px;color:#0b0628;font-size:16px;cursor:pointer;text-align:left}.newham-search span{font-size:25px;color:#2547d8}.newham-search b{font-weight:900;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
    .newham-status{pointer-events:all;background:#0b0628;color:#fff;border-radius:999px;padding:7px 12px;font-size:12px;font-weight:800;box-shadow:0 6px 18px rgba(11,6,40,.22)}
    .newham-legend{position:absolute;left:50%;bottom:max(16px,env(safe-area-inset-bottom));transform:translateX(-50%);z-index:300;width:min(520px,calc(100vw - 24px));display:flex;gap:7px;overflow-x:auto;padding:8px;background:rgba(255,255,255,.94);border:1px solid #e7e3f0;border-radius:16px;box-shadow:0 12px 34px rgba(25,20,55,.16);scrollbar-width:none}.newham-legend::-webkit-scrollbar{display:none}.legend-pill{flex:0 0 auto;display:flex;align-items:center;gap:7px;background:#f7f6fc;border-radius:999px;padding:8px 10px;font-size:12px;font-weight:900;color:#3d394f}.legend-pill span{width:14px;height:14px;border-radius:4px;display:block}
    .coverage-note{position:absolute;left:50%;bottom:86px;transform:translateX(-50%);z-index:290;width:min(440px,calc(100vw - 24px));background:#fff7f2;border:1px solid #ffd9c2;color:#69300c;border-radius:14px;padding:12px 14px;font-size:13px;line-height:1.35;font-weight:800;box-shadow:0 10px 28px rgba(25,20,55,.12)}
    .maplibregl-ctrl-bottom-right,.maplibregl-ctrl-bottom-left,.maplibregl-ctrl-logo,.maplibregl-ctrl-attrib{display:none!important}
  `}</style><MapLibreMap center={center} zoom={zoom} segments={segments} offers={offers} places={places} onSegmentClick={selectSeg} onOfferClick={o=>{setSelectedSeg(null);setSelectedOffer(o)}} onMapMove={handleBoundsChange}/><Header onSearch={()=>setShowSearch(true)} parkingCount={segments.length} lineCount={lineCount} offersCount={offers.length}/><EmptyNote count={segments.length}/><Legend/>{selectedSeg&&<ParkingSheet segment={selectedSeg} onClose={()=>setSelectedSeg(null)} destination={center} onDirections={handleDirections}/>} {selectedOffer&&<OfferSheet offer={selectedOffer} onClose={()=>setSelectedOffer(null)} onDirections={handleDirections}/>} {showSearch&&<SearchOverlay onClose={()=>setShowSearch(false)} currentLocation={center} onSelect={loc=>{const next=clampToNewham({lat:loc.lat,lng:loc.lng});setCenter(next);setZoom(17);setShowSearch(false)}}/>}</div>
}
