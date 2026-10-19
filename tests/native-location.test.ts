import test from 'node:test'
import assert from 'node:assert/strict'
import { nativePosition } from '../src/lib/nativeLocation'
const point = { timestamp:1, coords:{ latitude:51.538,longitude:0.032,accuracy:150,altitude:null,altitudeAccuracy:null,heading:null,speed:null } }
function bridge(permission: any, requested = permission, result = point) {
  const calls:string[] = []
  return { calls, plugin:{
    checkPermissions:async()=>{calls.push('check');return permission},
    requestPermissions:async()=>{calls.push('request');return requested},
    getCurrentPosition:async()=>{calls.push('position');return result},
  } }
}
test('approximate native permission is usable without another prompt',async()=>{
 const b=bridge({location:'denied',coarseLocation:'granted'})
 assert.equal((await nativePosition(b.plugin,{})).coords.latitude,51.538)
 assert.deepEqual(b.calls,['check','position'])
})
test('native location obtains permission before asking for coordinates',async()=>{
 const b=bridge({location:'prompt',coarseLocation:'prompt'},{location:'granted',coarseLocation:'granted'})
 await nativePosition(b.plugin,{enableHighAccuracy:false})
 assert.deepEqual(b.calls,['check','request','position'])
})
test('denied native permission never fetches coordinates',async()=>{
 const b=bridge({location:'denied',coarseLocation:'denied'})
 await assert.rejects(nativePosition(b.plugin,{}),(e:any)=>e.code===1)
 assert.deepEqual(b.calls,['check','request'])
})
test('invalid native coordinates do not enter the map',async()=>{
 const b=bridge({location:'granted'},undefined,{...point,coords:{...point.coords,latitude:NaN}})
 await assert.rejects(nativePosition(b.plugin,{}),/valid location/)
})
test('native optional coordinate fields become null',async()=>{
 const b=bridge({location:'granted'},undefined,{timestamp:1,coords:{latitude:51,longitude:0,accuracy:20}} as any)
 assert.equal((await nativePosition(b.plugin,{})).coords.altitudeAccuracy,null)
})
