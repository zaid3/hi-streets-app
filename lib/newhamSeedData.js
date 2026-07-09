export const NEWHAM_CENTER={lat:51.537,lng:0.0325}

export const NEWHAM_BOUNDS={south:51.490,west:-0.030,north:51.565,east:0.100}

export function inNewhamBounds(point,bounds=NEWHAM_BOUNDS){
  if(!point)return false
  const lat=Number(point.lat),lng=Number(point.lng)
  return Number.isFinite(lat)&&Number.isFinite(lng)&&lat>=bounds.south&&lat<=bounds.north&&lng>=bounds.west&&lng<=bounds.east
}

export function clampToNewham(point){
  return inNewhamBounds(point)?point:NEWHAM_CENTER
}

export function boundsIntersect(a,b=NEWHAM_BOUNDS){
  if(!a)return true
  return !(a.west>b.east||a.east<b.west||a.south>b.north||a.north<b.south)
}

export function boundsAround(center=NEWHAM_CENTER,span=0.018){
  return{south:center.lat-span,west:center.lng-span,north:center.lat+span,east:center.lng+span}
}

export const newhamParkingSegments=[
  {id:'newham-green-st-free',type:'free',color:'#078d16',coords:[[51.53652,0.03028],[51.5369,0.03305]],name:'Green Street northbound bays',restriction:'Free short-stay parking outside controlled hours',hours:'Mon-Sat 8am-6.30pm controlled',maxStay:'2 hours',isCarPark:false},
  {id:'newham-green-st-paid',type:'paid',color:'#0b73d9',coords:[[51.53536,0.03102],[51.53632,0.03158]],name:'Green Street market bays',restriction:'Paid parking during controlled hours',hours:'Mon-Sat 8am-6.30pm',maxStay:'2 hours',isCarPark:false},
  {id:'newham-romford-rd-paid',type:'paid',color:'#0b73d9',coords:[[51.54274,0.02435],[51.54335,0.02776]],name:'Romford Road pay bays',restriction:'Pay and display / phone parking',hours:'Mon-Sat 8am-6.30pm',maxStay:'4 hours',isCarPark:false},
  {id:'newham-woodgrange-free',type:'free',color:'#078d16',coords:[[51.5491,0.02464],[51.5507,0.02603]],name:'Woodgrange Road shopper bays',restriction:'Free short-stay shopper bays',hours:'Mon-Sat 8am-6.30pm controlled',maxStay:'1 hour',isCarPark:false},
  {id:'newham-high-st-north-paid',type:'paid',color:'#0b73d9',coords:[[51.53884,0.05242],[51.54068,0.05348]],name:'High Street North pay bays',restriction:'Paid parking near East Ham shops',hours:'Mon-Sat 8am-6.30pm',maxStay:'2 hours',isCarPark:false},
  {id:'newham-katherine-disabled',type:'disabled',color:'#8E44AD',coords:[[51.53195,0.05438],[51.53227,0.0548]],name:'Katherine Road disabled bays',restriction:'Blue badge holders only',hours:'At all times',maxStay:'3 hours',isCarPark:false},
  {id:'newham-green-st-loading',type:'loading',color:'#ff681f',coords:[[51.53482,0.03078],[51.53505,0.03092]],name:'Green Street loading bay',restriction:'Loading only during signed hours',hours:'Mon-Sat 7am-7pm',maxStay:'40 minutes',isCarPark:false},
  {id:'newham-resident-east',type:'resident',color:'#078d16',coords:[[51.53794,0.0362],[51.53832,0.0378]],name:'Upton Park resident bays',restriction:'Resident permit holders during controlled hours',hours:'Mon-Sat 8am-6.30pm',maxStay:null,isCarPark:false},
  {id:'newham-marlow-paid',type:'paid',color:'#0b73d9',coords:[[51.53735,0.03355],[51.53762,0.0349]],name:'Marlow Road, Newham',restriction:'Pay to park after 08:00 tomorrow',hours:'Mon-Sat 8am-6.30pm',maxStay:'10h 1m',isCarPark:false,noReturn:'None'},
  {id:'newham-rancliffe-resident',type:'resident',color:'#078d16',coords:[[51.53267,0.0358],[51.53293,0.0374]],name:'Rancliffe Road, Newham',restriction:'No parking after 08:00 tomorrow',hours:'Mon-Sat 8am-6.30pm',maxStay:'9h 1m',isCarPark:false},
  {id:'newham-lawrence-disabled-no',type:'no_parking',color:'#9d9da5',coords:[[51.5382,0.0431],[51.5385,0.0446]],name:'Lawrence Road disabled restriction',restriction:'Applies at all times',hours:'At all times',maxStay:null,isCarPark:false},
  {id:'newham-basil-double-yellow',type:'yellow_double',color:'#9d9da5',coords:[[51.5311,0.0465],[51.5326,0.0471]],name:'Basil Avenue double yellow line',restriction:'Applies at all times',hours:'At all times',maxStay:null,isCarPark:false},
  {id:'newham-plashet-single-yellow',type:'yellow_single',color:'#078d16',coords:[[51.5382,0.0405],[51.5384,0.0431]],name:'Plashet Grove single yellow',restriction:'Controlled during signed hours',hours:'Mon-Sat 8am-6.30pm',maxStay:null,isCarPark:false},
  {id:'newham-east-ave-ev',type:'ev',color:'#29c9b2',coords:[[51.5389,0.0462],[51.53935,0.0476]],name:'East Avenue EV bays',restriction:'EV charging only',hours:'24 hours',maxStay:'4 hours',isCarPark:false},
  {id:'newham-red-route-a124',type:'red_route',color:'#9d9da5',coords:[[51.5358,0.0502],[51.5365,0.0522]],name:'High Street South red route',restriction:'No stopping on red route',hours:'At all times',maxStay:null,isCarPark:false},
  {id:'newham-stratford-cp',type:'carpark',color:'#0b73d9',coords:[[51.54185,0.0027]],name:'Stratford multi-storey car park',restriction:'Paid off-street parking',hours:'24 hours',maxStay:null,isCarPark:true,lat:51.54185,lng:0.0027},
  {id:'newham-east-ham-cp',type:'carpark',color:'#0b73d9',coords:[[51.5397,0.0529]],name:'Madge Gill Way car park',restriction:'Pay on foot',hours:'24 hours',maxStay:null,isCarPark:true,lat:51.5397,lng:0.0529},
  {id:'newham-green-st-cp',type:'carpark',color:'#0b73d9',coords:[[51.5357,0.0301]],name:'Green Street shoppers car park',restriction:'Pay & display',hours:'7am-10pm',maxStay:null,isCarPark:true,lat:51.5357,lng:0.0301},
]

export const newhamPlaces=[
  {id:'newham-poi-queen-market',name:"Queen's Market",category:'market',lat:51.5359,lng:0.0311,address:'Green Street, Upton Park'},
  {id:'newham-poi-boleyn',name:'Boleyn Tavern',category:'pub',lat:51.53278,lng:0.0397,address:'Barking Road'},
  {id:'newham-poi-east-ham-library',name:'East Ham Library',category:'civic',lat:51.53657,lng:0.05162,address:'High Street South'},
  {id:'newham-poi-forest-gate',name:'Forest Gate Station',category:'transport',lat:51.54943,lng:0.02436,address:'Woodgrange Road'},
  {id:'newham-poi-upton-park',name:'Upton Park Station',category:'transport',lat:51.53514,lng:0.03455,address:'Green Street'},
  {id:'newham-poi-east-ham-station',name:'East Ham Station',category:'transport',lat:51.5394,lng:0.0521,address:'High Street North'},
  {id:'newham-poi-lidl',name:'Lidl East Ham',category:'grocery',lat:51.5405,lng:0.051,address:'High Street North'},
  {id:'newham-poi-pharmacy',name:'Forest Gate Pharmacy',category:'pharmacy',lat:51.5502,lng:0.0364,address:'Woodgrange Road'},
  {id:'newham-poi-cafe',name:'East Ham Coffee',category:'coffee',lat:51.5401,lng:0.0533,address:'High Street North'},
]

export const newhamOffers=[
  {id:'newham-offer-grill',businessName:'Green Street Grill',category:'food',shortLabel:'20% off lunch',title:'20% off all lunch orders',description:'Show this map offer in store for 20% off lunch today.',discount:'20% off',lat:51.5370,lng:0.0325,expiresAt:new Date(Date.now()+6*3600000).toISOString(),source:'whatsapp',status:'live',address:'142 Green Street, Newham',verified:true,googlePlaceId:'demo-green-street-grill'},
  {id:'newham-offer-market',businessName:"Queen's Market Produce",category:'retail',shortLabel:'£5 fruit bowls',title:'Fresh fruit bowls for £5',description:"Today only from participating Queen's Market stalls.",discount:'£5 deal',lat:51.5359,lng:0.0311,expiresAt:new Date(Date.now()+5*3600000).toISOString(),source:'seed',status:'live',address:"Queen's Market, Green Street",verified:true,googlePlaceId:'demo-queens-market'},
  {id:'newham-offer-coffee',businessName:'East Ham Coffee',category:'food',shortLabel:'Free cake',title:'Free cake with any hot drink',description:'Any hot drink includes a free slice of cake until closing.',discount:'Free cake',lat:51.5401,lng:0.0533,expiresAt:new Date(Date.now()+7*3600000).toISOString(),source:'whatsapp',status:'live',address:'22 High Street North',verified:true,googlePlaceId:'demo-east-ham-coffee'},
  {id:'newham-offer-barber',businessName:'Upton Park Barbers',category:'beauty',shortLabel:'£5 off cuts',title:'£5 off walk-in haircuts',description:'Walk in before 6pm and show this offer to get £5 off your haircut.',discount:'£5 off',lat:51.5354,lng:0.0342,expiresAt:new Date(Date.now()+8*3600000).toISOString(),source:'portal',status:'live',address:'Green Street, Upton Park',verified:true,googlePlaceId:'demo-upton-park-barbers'},
]
