const NOM='https://nominatim.openstreetmap.org'
export async function searchUK(q){
  try{
    const r=await fetch(`${NOM}/search?format=json&q=${encodeURIComponent(q)}&countrycodes=gb&limit=8&addressdetails=1`,{headers:{'User-Agent':'HiStreets/1.0 (histreets.uk)'}})
    const d=await r.json()
    return d.map(p=>({id:p.place_id,name:p.display_name.split(',').slice(0,2).join(', ').trim(),fullName:p.display_name,lat:parseFloat(p.lat),lng:parseFloat(p.lon),type:p.type,class:p.class}))
  }catch{return[]}
}
export function getCurrentLocation(){
  return new Promise((res,rej)=>{
    if(!navigator.geolocation){rej(new Error('Not supported'));return}
    navigator.geolocation.getCurrentPosition(p=>res({lat:p.coords.latitude,lng:p.coords.longitude}),rej,{timeout:12000,maximumAge:60000,enableHighAccuracy:true})
  })
}
export const UK_DEFAULT={lat:51.5074,lng:-0.1278,zoom:15}
