export const mockOffers=[
  {id:'m1',businessName:'Green Street Grill',category:'food',shortLabel:'20% off lunch',title:'20% off all lunch orders',description:'20% off everything on our lunch menu — dine in or takeaway. Show this offer when ordering.',discount:'20% off',lat:51.5370,lng:0.0325,expiresAt:new Date(Date.now()+6*3600000).toISOString(),source:'whatsapp',status:'live',address:'142 Green Street, Newham'},
  {id:'m2',businessName:'Forest Gate Pharmacy',category:'health',shortLabel:'Free delivery',title:'Free prescription delivery today',description:'Free same-day delivery on all NHS prescriptions within E7. Call to arrange.',discount:'Free delivery',lat:51.5502,lng:0.0364,expiresAt:new Date(Date.now()+8*3600000).toISOString(),source:'portal',status:'live',address:'89 Woodgrange Road'},
  {id:'m3',businessName:'Sari Palace',category:'retail',shortLabel:'Buy 2 get 1 free',title:'Buy 2 sarees, get 1 free',description:'Any 3 sarees from our new collection — pay for 2, take 3. Today only in store.',discount:'Buy 2 get 1',lat:51.5358,lng:0.0312,expiresAt:new Date(Date.now()+4*3600000).toISOString(),source:'whatsapp',status:'live',address:'Green Street Market'},
  {id:'m4',businessName:'East Ham Coffee',category:'food',shortLabel:'Free cake with coffee',title:'Free slice of cake with any hot drink',description:'Any hot drink + free homemade cake. All day today until we close at 6pm.',discount:'Free cake',lat:51.5401,lng:0.0533,expiresAt:new Date(Date.now()+5*3600000).toISOString(),source:'portal',status:'live',address:'22 High Street North'},
]

export function getCatColor(cat){
  const m={food:'#ff681f',retail:'#9B59B6',health:'#2ECC71',beauty:'#E91E8C',services:'#4A9EFF',other:'#F39C12'}
  return m[cat]||m.other
}
export function getCatIcon(cat){
  const m={food:'🍔',retail:'🛍️',health:'💊',beauty:'💅',services:'🔧',other:'⭐'}
  return m[cat]||m.other
}
