import { Car, Clock, MapPin, ShieldCheck } from 'lucide-react'

export default function LocalParkingComingSoon() {
  return (
    <section className="feed-screen">
      <header className="screen-header">
        <h1>Local parking</h1>
        <p>Coming soon for Newham. We will only show parking information after it is properly checked.</p>
      </header>

      <div className="privacy-card">
        <h2><Car size={20} /> Parking coming soon</h2>
        <p className="muted">HiStreets will add local parking later, but it will not show unverified or risky parking data.</p>
        <div className="listing-chip-row">
          <span className="listing-chip"><MapPin size={12} /> Newham only</span>
          <span className="listing-chip"><ShieldCheck size={12} /> Verified data only</span>
          <span className="listing-chip"><Clock size={12} /> Future release</span>
        </div>
      </div>

      <div className="empty">
        <strong>No parking data is live yet.</strong>
        <span>For now, HiStreets focuses on approved businesses, offers, jobs, free meals and community support. Parking will be added when the data can be checked safely.</span>
      </div>
    </section>
  )
}
