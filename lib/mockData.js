
// Newham / East Ham area mock data
export const mockOffers = [
  { id:1, businessId:1, businessName:"Cafe Nero", category:"food", shortLabel:"20% off lunch", title:"20% Off All Lunch Orders", description:"Enjoy 20% off all lunch orders until 5pm. Dine-in and takeaway.", distance:"0.2 mi", expiresAt: new Date(Date.now()+4*3600000).toISOString(), lat:51.5370, lng:0.0500, terms:"Not valid with other offers.", source:"app", status:"live", views:512, saves:34 },
  { id:2, businessId:2, businessName:"Urban Bites", category:"food", shortLabel:"Flat 15% off", title:"Flat 15% Off Everything", description:"Get 15% off your entire order this weekend only.", distance:"0.4 mi", expiresAt: new Date(Date.now()+8*3600000).toISOString(), lat:51.5355, lng:0.0480, terms:"Weekend only.", source:"whatsapp", status:"live", views:340, saves:21 },
  { id:3, businessId:3, businessName:"Tech Fix", category:"services", shortLabel:"Free laptop check", title:"Free Laptop Health Check", description:"Bring in your laptop for a free 15-minute diagnostic.", distance:"0.6 mi", expiresAt: new Date(Date.now()+24*3600000).toISOString(), lat:51.5385, lng:0.0520, terms:"No obligation.", source:"app", status:"live", views:128, saves:9 },
  { id:4, businessId:4, businessName:"Beauty Hub", category:"beauty", shortLabel:"Buy 1 get 1 50%", title:"Buy 1 Get 1 at 50% Off", description:"All nail treatments. Book today and save.", distance:"0.3 mi", expiresAt: new Date(Date.now()+12*3600000).toISOString(), lat:51.5360, lng:0.0510, terms:"Selected treatments only.", source:"app", status:"live", views:89, saves:15 },
  { id:5, businessId:5, businessName:"Green Grocers", category:"retail", shortLabel:"3 for 2 on fruit", title:"3 for 2 on All Fresh Fruit", description:"Stock up and save on fresh fruit today.", distance:"0.1 mi", expiresAt: new Date(Date.now()+6*3600000).toISOString(), lat:51.5375, lng:0.0495, terms:"While stocks last.", source:"whatsapp", status:"live", views:203, saves:44 },
]

export const mockParking = [
  { id:1, type:"free", name:"Green Street", address:"Green Street, Newham, E7", lat:51.5373, lng:0.0503, status:"Park for free", statusColor:"#2ECC71", maxStay:"2 hours", hours:"Mon-Sat 8am-6:30pm", freeUntil:"6:30 PM", leaveBy:"6:30 PM", side:"Left side", cost:0, noReturn:"1 hour", tags:["Free","Time limited"], info:"If you park now at 10:45 PM, you can stay until 8:00 AM." },
  { id:2, type:"paid", name:"Barking Road", address:"Barking Road, Newham, E6", lat:51.5350, lng:0.0540, status:"Pay to park", statusColor:"#4A9EFF", maxStay:"4 hours", hours:"Mon-Sat 8am-6:30pm", cost:2.50, noReturn:"None", tags:["Paid","PayPoint"], info:"Paid parking in operation. £2.50 per hour." },
  { id:3, type:"free", name:"Kingsland Road", address:"Kingsland Road, Newham", lat:51.5390, lng:0.0460, status:"Park for free", statusColor:"#2ECC71", maxStay:"Unlimited", hours:"Evenings & Weekends", freeUntil:"8:00 AM", leaveBy:"8:00 AM", side:"Right side", cost:0, noReturn:"None", tags:["Free","Evenings"], info:"Free parking available. Restrictions start 8am." },
  { id:4, type:"restricted", name:"East Ham High Street", address:"East Ham High Street, E6", lat:51.5340, lng:0.0530, status:"No parking", statusColor:"#E74C3C", maxStay:"0", hours:"Mon-Sat 8am-6:30pm", cost:0, noReturn:"N/A", tags:["Double yellow","No stopping"], info:"Double yellow lines. No parking at any time." },
  { id:5, type:"paid", name:"Newham Leisure Centre", address:"Prince Regent Lane, E13", lat:51.5310, lng:0.0480, status:"Pay to park", statusColor:"#F39C12", maxStay:"3 hours", hours:"All day", cost:1.80, noReturn:"None", tags:["Car park","Pay & Display"], info:"Off-street car park. £1.80 per hour." },
]

export const mockNotifications = [
  { id:1, type:"offer", icon:"🛍️", title:"Nearby offer", body:"20% off at Café Nero, 0.2 mi away. Valid till 11:59 PM.", time:"2m ago", read:false },
  { id:2, type:"parking", icon:"🅿️", title:"Parking reminder", body:"Your free parking ends today at 8:00 AM.", time:"10m ago", read:false },
  { id:3, type:"offer", icon:"🛍️", title:"New offer near you", body:"Flat 15% off at Urban Bites, 0.4 mi away.", time:"Yesterday", read:true },
  { id:4, type:"update", icon:"📢", title:"Parking rule changed", body:"New restrictions on Green Street from Monday.", time:"2 days ago", read:true },
]

export const mockBusinessStats = {
  offersLive: 2,
  profileViews: 1248,
  views: 12400,
  taps: 3200,
  saves: 842,
  mapOpens: 1600,
  topOffers: [
    { title:"20% off Lunch", views:2140 },
    { title:"Happy Hour 1+1", views:1680 },
    { title:"Weekend Brunch", views:1230 },
  ]
}

export const mockBusinessOffers = [
  { id:1, title:"20% off Lunch", status:"live", schedule:"Today, 11:30 AM - 5:00 PM", views:256, taps:512 },
  { id:2, title:"Happy Hour 1+1", status:"scheduled", schedule:"Today, 5:00 PM - 8:30 PM", startsIn:"3h 20m" },
  { id:3, title:"Weekend Brunch", status:"draft", updated:"2d ago" },
  { id:4, title:"Free Coffee", status:"expired", expiredOn:"18 May", views:1300, taps:245 },
  { id:5, title:"Old Offer", status:"rejected", reason:"Misleading terms" },
]

export const getCategoryIcon = (cat) => ({ food:"🍕", retail:"🛍️", services:"🔧", beauty:"💅", health:"💊", cafe:"☕" }[cat] || "🏪")
export const getCategoryColor = (cat) => ({ food:"#ff681f", retail:"#4ECDC4", services:"#45B7D1", beauty:"#F72585", health:"#4CC9F0" }[cat] || "#ff681f")
