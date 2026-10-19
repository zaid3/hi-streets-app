import { test, expect } from '@playwright/test'

test.beforeEach(async ({ page }) => {
  await page.addInitScript(() => {
    const w = window as any
    w.androidBridge = {}
    w.nativeCalls = []
    w.nativeEvents = {}
    const plugins: Record<string,string[]> = {
      App:['exitApp','addListener','removeListener'], Browser:['open'],
      Keyboard:['hide','addListener','removeListener'], SplashScreen:['hide'],
      Geolocation:['checkPermissions','requestPermissions','getCurrentPosition'],
    }
    w.Capacitor = {
      PluginHeaders:Object.entries(plugins).map(([name,methods])=>({name,methods:methods.map(name=>({name,rtype:name==='addListener'?'callback':'promise'}))})),
      nativePromise:async(plugin:string,method:string,options:any)=>{
        w.nativeCalls.push({plugin,method,options})
        if (method==='checkPermissions') return {location:'denied',coarseLocation:'granted'}
        if (method==='getCurrentPosition') return {timestamp:Date.now(),coords:{latitude:51.537,longitude:0.0325,accuracy:100}}
        return {}
      },
      nativeCallback:(plugin:string,method:string,options:any,callback:any)=>{
        w.nativeEvents[`${plugin}:${options.eventName}`] = callback
        return 'test-listener'
      },
    }
  })
})

test('native location starts on user action and accepts approximate permission',async({page})=>{
 await page.goto('/map')
 await expect(page.getByRole('heading',{name:'Use your location?'})).toBeVisible()
 expect(await page.evaluate(()=>(window as any).nativeCalls.filter((c:any)=>c.plugin==='Geolocation').length)).toBe(0)
 await page.getByRole('button',{name:'Show what is near me'}).click()
 await expect(page.getByRole('status')).toContainText('Showing places near your location.')
 expect(await page.evaluate(()=>(window as any).nativeCalls.filter((c:any)=>c.method==='requestPermissions').length)).toBe(0)
 expect(await page.evaluate(async()=>navigator.serviceWorker ? (await navigator.serviceWorker.getRegistrations()).length : 0)).toBe(0)
})

test('native Back dismisses the location prompt before navigating',async({page})=>{
 await page.goto('/map')
 await expect(page.getByRole('heading',{name:'Use your location?'})).toBeVisible()
 await page.evaluate(()=>(window as any).nativeEvents['App:backButton']({canGoBack:false}))
 await expect(page.getByRole('heading',{name:'Use your location?'})).toHaveCount(0)
 expect(await page.evaluate(()=>(window as any).nativeCalls.filter((c:any)=>c.method==='exitApp').length)).toBe(0)
 await page.getByRole('button',{name:'Jobs',exact:true}).click()
 await expect(page.getByRole('heading',{name:'Jobs in Newham'})).toBeVisible()
 await page.evaluate(()=>(window as any).nativeEvents['App:backButton']({canGoBack:false}))
 await expect(page).toHaveURL(/\/map$/)
})

test('native external links open the browser without navigating the app',async({page})=>{
 await page.goto('/business')
 await page.getByRole('link',{name:'HiStreets website',exact:true}).click()
 await expect.poll(()=>page.evaluate(()=>(window as any).nativeCalls.some((c:any)=>c.plugin==='Browser'&&c.options?.url==='https://histreets.uk/'))).toBeTruthy()
 await expect(page).toHaveURL(/\/business$/)
 await page.getByRole('link',{name:'Privacy',exact:true}).click()
 await expect.poll(()=>page.evaluate(()=>(window as any).nativeCalls.some((c:any)=>c.options?.url==='https://app.histreets.uk/privacy.html'))).toBeTruthy()
})

test('native keyboard hides tabs and landscape search stays on screen',async({page})=>{
 await page.goto('/map')
 await page.getByRole('button',{name:'Use Newham map for now'}).click()
 await page.evaluate(()=>(window as any).nativeEvents['Keyboard:keyboardWillShow']({keyboardHeight:250}))
 await expect(page.locator('.bottom-tabs')).toBeHidden()
 await page.evaluate(()=>(window as any).nativeEvents['Keyboard:keyboardDidHide']({}))
 await expect(page.locator('.bottom-tabs')).toBeVisible()
 await page.setViewportSize({width:844,height:390})
 const box=await page.locator('.smart-map-search').boundingBox()
 expect(box).not.toBeNull()
 expect(box!.x).toBeGreaterThanOrEqual(0)
 expect(box!.x+box!.width).toBeLessThanOrEqual(844)
})
