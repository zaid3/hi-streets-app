# Hi-Streets — CLAUDE.md

## What is Hi-Streets?

Hi-Streets is a UK-focused **PWA** (Progressive Web App) for discovering live on-street parking availability and nearby business offers on an interactive map. Two personas:

- **Consumers** – find free/paid parking bays, see operating hours, get directions, set parking timers, and discover local business deals.
- **Business owners** – post real-time offers via a chat AI interface or WhatsApp; manage their business profile and verification status.

Primary geography: East London (Green Street, East Ham, Forest Gate) with OSM data for the wider UK.

---

## Tech Stack

| Layer | Technology |
|---|---|
| Framework | Next.js 14 App Router (React 18) |
| Maps | MapLibre GL 4 (open-source, no API key needed) |
| Backend / Auth | Supabase (PostgreSQL + Auth + Realtime) |
| AI parsing | Google Gemini Flash (free tier) with rule-based fallback |
| Styling | Tailwind CSS 3 + custom CSS in `globals.css` |
| Deployment | Coolify / any Node.js host |

---

## Key Environment Variables

```
NEXT_PUBLIC_SUPABASE_URL=https://bbfmrxefabmhtlshgemu.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=sb_publishable_...
GEMINI_API_KEY=<optional — falls back to rule-based parser>
```

Copy `.env.local.example` → `.env.local` and fill in values.

---

## File Map

```
app/
  layout.js          # Root layout — PWA manifest, meta, safe-area
  page.js            # Root → redirect to /splash or /map
  globals.css        # Global styles + MapLibre overrides + component classes
  map/page.js        # Main map screen — parking, offers, timer, find-free-bay
  business/page.js   # Business portal — chat AI, offer posting, verification
  login/page.js      # OTP email sign-in
  splash/page.js     # 3-step onboarding carousel
  api/parse-offer/   # Server action: calls Gemini to parse offer text

components/
  MapLibreMap.js     # Core map renderer (parking segments, offer markers, user dot)
  ParkingSheet.js    # Bottom sheet: bay detail, hours timeline, timer picker, directions
  ParkingTimer.js    # Timer widget + useParkingTimer hook (localStorage-persisted)
  OfferSheet.js      # Bottom sheet: offer detail, claim/save/share
  FiltersSheet.js    # Filter drawer: bay types, distance, blue badge, vehicle type
  ListViewSheet.js   # List view of parking sorted by distance/price/duration
  SearchOverlay.js   # Full-screen destination search (Nominatim OSM)
  SideMenu.js        # Slide-out nav menu

lib/
  supabase.js        # Supabase client init (real or mock if no env vars)
  gemini.js          # parseOfferWithAI() + rule-based fallback parser
  parkingAdapter.js  # getParkingData(): OSM Overpass → mock fallback
  offersAdapter.js   # getLiveOffers(), publishOffer(), subscribeToOffers()

data/
  mockOffers.js      # Static mock offers + getCatColor/getCatIcon helpers

public/
  manifest.json      # PWA manifest
  icons/             # icon-192.png, icon-512.png, icon.svg
```

---

## Features Built

### Map screen (`/map`)
- Interactive MapLibre map centred on user location
- On-street parking segments colour-coded by type (free=green, paid=blue, permit=purple, restricted=grey, carpark=dark-blue)
- Real-time OSM Overpass data with mock fallback
- **TimeSelector** — arrival time + duration picker
- **Zone / Bay / List** view tabs
- Floating buttons: Filters ⚙️, Locate 📍, **Find free bay 🅿️**, Offers toggle 🛍️, Business 🏪
- **Find free bay** — tapping 🅿️ or the tab bar "Free bay" button finds the nearest free segment using haversine distance and auto-selects it
- Live offers counter pill when offers are visible
- Bottom tab bar: Map | List | Free bay | Account
- Toast notifications for user feedback

### Parking sheet (`ParkingSheet`)
- Status chip, 24h operating hours timeline with current-time cursor
- Stay-up-to calculator
- Walking time (haversine from destination)
- Report data issue button
- **Directions** (Apple Maps / Google Maps / Waze picker)
- **⏱ Park here** button → opens `TimerDurationPicker` modal

### Parking timer (`ParkingTimer.js`)
- `useParkingTimer()` hook — stores timer in `localStorage` key `hs-parking-timer`
- Survives page refresh / browser close
- `ParkingTimerWidget` floating over the map: SVG countdown ring, bay name, +30m extend, Stop
- Visual states: green (normal) → amber warning (<10 min) → red expired
- CSS pulse animation when warning/expired

### Find free bay near me
- `findNearestFree(segments, userLat, userLng)` — haversine distance to all free segments
- Triggered from floating 🅿️ button or "Free bay" tab
- Shows toast if no free bays are visible ("try zooming out")
- Pans map to the bay and opens ParkingSheet

### Business portal (`/business`)
- Chat interface: type offer → AI parses → preview → post to Supabase
- Gemini Flash AI (rule-based fallback if no key)
- **Tabs**: Post offer | My offers | 🏢 Setup/Profile | WhatsApp
- **Verification flow** (`VerifyTab`):
  - Step 1: Business name + category (6 options)
  - Step 2: Address + optional phone
  - Saves to `businesses` table in Supabase (upsert on `user_id`)
  - Step 3: Confirmation with pending-verification badge
  - Header shows `✓ VERIFIED` badge when `business.verified = true`

### PWA (`public/manifest.json` + `app/layout.js`)
- `manifest.json` with name, icons, `display: standalone`, `theme_color: #ff681f`
- Shortcuts: "Find Free Parking" → `/map`, "Business Portal" → `/business`
- Apple Web App meta tags, `themeColor` in viewport export
- Icons: `icon-192.png`, `icon-512.png`, `icon.svg` in `public/icons/`

---

## What Still Needs Doing

- [ ] **Real icon assets** — replace the solid-orange placeholder PNGs with a proper Hi-Streets logo (designer task)
- [ ] **Business geocoding** — after saving address, reverse-geocode to lat/lng and save to `businesses` table so businesses appear as map markers
- [ ] **Business map markers** — show verified businesses as pins on the map with a click-through to their active offers
- [ ] **Offer expiry management** — UI to deactivate/extend offers from "My offers" tab
- [ ] **Blue badge parking** — filter currently wired in but OSM data tagging is inconsistent
- [ ] **WhatsApp bot** — Twilio or Cloud API webhook to receive WhatsApp messages and call `/api/parse-offer`
- [ ] **Push notifications** — Web Push API to alert users when parking timer is about to expire (needs service worker)
- [ ] **Service worker / offline** — Add Next.js PWA plugin (`next-pwa`) for offline caching
- [ ] **Zone view** — currently same as bay view; should cluster segments by zone with aggregate pricing info
- [ ] **Supabase realtime for businesses** — subscribe to `businesses` table changes so new verifications appear live
- [ ] **Admin verification dashboard** — simple internal page to flip `businesses.verified = true`
- [ ] **Saved places** — SideMenu has "Saved places" stub, needs implementation
- [ ] **Settings page** — currently stub

---

## Database Schema

See `SUPABASE_SETUP.sql`. Two tables:

- **`businesses`** — `id, user_id, name, address, phone, whatsapp_number, lat, lng, place_id, category, verified, google_maps_url, created_at`
- **`offers`** — `id, business_id, title, short_label, description, discount, is_active, expires_at, source, created_at`

RLS: public can read active offers; users manage their own business + offers.

---

## Dev Commands

```bash
npm run dev    # Start dev server on :3000
npm run build  # Production build
npm start      # Run production build
```

No test suite yet — `npm test` will fail.

---

## Colour Palette

| Use | Value |
|---|---|
| Brand orange | `#ff681f` |
| Free parking | `#2ECC71` |
| Paid parking | `#4A9EFF` |
| Permit | `#9B59B6` |
| Restricted | `#888` |
| Car park | `#2a5fba` |
| Dark bg | `#0a0a0a` |
| Sheet bg | `#141414` |
| Card bg | `rgba(255,255,255,.05)` |
