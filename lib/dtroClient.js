import{Buffer}from'node:buffer'

const DEFAULT_BASE_URL='https://dtro.dft.gov.uk/v1'

let tokenCache={accessToken:'',expiresAt:0}

function timeoutSignal(ms){
  if(typeof AbortSignal!=='undefined'&&AbortSignal.timeout)return AbortSignal.timeout(ms)
  const controller=new AbortController()
  setTimeout(()=>controller.abort(),ms)
  return controller.signal
}

export function dtroConfig(){
  const baseUrl=(process.env.D_TRO_API_BASE_URL||DEFAULT_BASE_URL).replace(/\/$/,'')
  const clientId=process.env.D_TRO_API_KEY||process.env.D_TRO_CLIENT_ID||''
  const clientSecret=process.env.D_TRO_SECRET_KEY||process.env.D_TRO_CLIENT_SECRET||''
  const appId=process.env.D_TRO_APP_ID||''
  return{baseUrl,clientId,clientSecret,appId,configured:Boolean(clientId&&clientSecret)}
}

export async function getDtroAccessToken(){
  const cfg=dtroConfig()
  if(!cfg.configured)throw new Error('D-TRO credentials are not configured')
  const now=Date.now()
  if(tokenCache.accessToken&&tokenCache.expiresAt-now>60000)return tokenCache.accessToken
  const body=new URLSearchParams({grant_type:'client_credentials'})
  const res=await fetch(`${cfg.baseUrl}/oauth-generator`,{
    method:'POST',
    headers:{
      Authorization:`Basic ${Buffer.from(`${cfg.clientId}:${cfg.clientSecret}`).toString('base64')}`,
      'Content-Type':'application/x-www-form-urlencoded',
      Accept:'application/json',
    },
    body,
    cache:'no-store',
    signal:timeoutSignal(30000),
  })
  if(!res.ok){
    const text=await res.text().catch(()=>'')
    throw new Error(`D-TRO token request failed (${res.status}): ${text.slice(0,240)}`)
  }
  const json=await res.json()
  if(!json.access_token)throw new Error('D-TRO token response did not include access_token')
  const ttl=Number(json.expires_in||1700)
  tokenCache={accessToken:json.access_token,expiresAt:now+(Math.max(60,ttl)-30)*1000}
  return tokenCache.accessToken
}

export async function dtroRequest(path,{method='GET',body,headers={}}={}){
  const cfg=dtroConfig()
  const token=await getDtroAccessToken()
  const requestHeaders={
    Authorization:`Bearer ${token}`,
    Accept:'application/json',
    ...headers,
  }
  if(cfg.appId)requestHeaders['App-Id']=cfg.appId
  if(body&&!(body instanceof FormData))requestHeaders['Content-Type']='application/json'
  const res=await fetch(`${cfg.baseUrl}${path}`,{
    method,
    headers:requestHeaders,
    body:body?body instanceof FormData?body:JSON.stringify(body):undefined,
    cache:'no-store',
    signal:timeoutSignal(45000),
  })
  if(!res.ok){
    const text=await res.text().catch(()=>'')
    throw new Error(`D-TRO request ${path} failed (${res.status}): ${text.slice(0,300)}`)
  }
  const text=await res.text()
  if(!text)return null
  try{return JSON.parse(text)}catch{return text}
}

export async function searchDtros({regulationType,page=1,pageSize=25}={}){
  const query=regulationType?{regulationType}:{}
  return dtroRequest('/search',{method:'POST',body:{queries:[query],page,pageSize}})
}

export async function getDtroById(id){
  if(!id)throw new Error('Missing D-TRO id')
  return dtroRequest(`/dtros/${encodeURIComponent(id)}`)
}

export async function getAllDtrosDownloadUrl(){
  return dtroRequest('/dtros/all')
}
