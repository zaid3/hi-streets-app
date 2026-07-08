// Parking data adapter.
// Priority:
// 1) verified Newham seed data for the MVP area
// 2) OSM/Overpass where parking tags exist
// 3) no fake street bays outside reliable data coverage
import{boundsIntersect,newhamParkingSegments}from'./newhamSeedData'
const OVERPASS='https://overpass-api.de/api/interpreter'
export function isLondon(lat,lng){return lat>51.28&&lat<51.7&&lng>-0.51&&lng<0.34}
export async function getParkingData(bounds){const seed=boundsIntersect(bounds)?newhamParkingSegments:[];try{const data=await fetchOverpass(bounds);const merged=mergeById([...seed,...data]);if(merged.length)return merged}catch{}return seed}
async function fetchOverpass(bounds){if(!bounds)throw new Error('Missing bounds');const{south,west,north,east}=bounds;const bbox=`${south},${west},${north},${east}`;const q=`[out:json][timeout:10];(
  way["parking"="lane"](${bbox});
  way["parking:lane:both"](${bbox});
  way["parking:lane:left"](${bbox});
  way["parking:lane:right"](${bbox});
  way["amenity"="parking"](${bbox});
  node["amenity"="parking"](${bbox});
);out geom qt 80;`;const res=await fetch(OVERPASS,{method:'POST',body:'data='+encodeURIComponent(q),signal:AbortSignal.timeout(8000)});if(!res.ok)throw new Error('Overpass failed');const json=await res.json();return processOverpass(json.elements||[])}
function processOverpass(elements){const now=new Date(),h=now.getHours(),dow=now.getDay(),isPaid=h>=8&&h<18&&dow>=1&&dow<=6;return elements.slice(0,80).map((el,i)=>{const tags=el.tags||{};const isCarPark=tags.amenity==='parking';const coords=el.geometry?.length?el.geometry.map(g=>[g.lat,g.lon]):(el.lat&&el.lon?[[el.lat,el.lon]]:null);if(!coords?.length)return null;const lane=[tags['parking:lane:both'],tags['parking:lane:left'],tags['parking:lane:right'],tags.parking].filter(Boolean).join(' ');const permit=/permit|residents?/i.test(lane),disabled=/disabled/i.test(tags.parking||tags.capacity?.disabled||''),loading=/loading/i.test(lane),nopark=/no_parking|no_stopping/i.test(lane);let type,color;if(isCarPark){type='carpark';color='#0b73d9'}else if(disabled){type='disabled';color='#8E44AD'}else if(loading){type='loading';color='#ff681f'}else if(nopark){type='no_parking';color='#9d9da5'}else if(permit){type='resident';color='#078d16'}else if(isPaid){type='paid';color='#0b73d9'}else{type='free';color='#078d16'}const lat=el.lat||coords[0]?.[0],lng=el.lon||coords[0]?.[1];return{id:`osm-${el.id||i}`,type,color,coords,name:tags.name||tags['addr:street']||(isCarPark?'Parking':'Parking place'),restriction:permit?'Resident permit holders only':nopark?'No parking':isPaid?'Paid parking during controlled hours':'Check local signs',hours:isPaid?'Mon–Sat daytime controlled':'Check local signs',maxStay:tags.maxstay||null,isCarPark,lat:isCarPark?lat:undefined,lng:isCarPark?lng:undefined,source:'osm'}}).filter(Boolean)}
function mergeById(items){return Array.from(new Map(items.filter(Boolean).map(item=>[item.id,item])).values())}
export function getMockSegments(){return[]}
