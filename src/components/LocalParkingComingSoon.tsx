import { Car, Clock, MapPin, ShieldCheck } from 'lucide-react'

export default function LocalParkingComingSoon() {
  return (
    <section className="feed-screen">
      <header className="screen-header">
        <h1>Local parking</h1>
        <p>Coming soon for Newham: local free parking, paid parking and Blue Badge parking.</p>
      </header>

      <div className="privacy-card parking-soon-card">
        <h2><Car size={20} /> Parking coming soon</h2>
        <p className="muted">Parking will be added only when the data is properly checked. We will not show unsafe or guessed parking information.</p>
        <div className="parking-soon-list">
          <span><MapPin size={16} /> Free local parking</span>
          <span><Car size={16} /> Paid parking</span>
          <span><ShieldCheck size={16} /> Blue Badge parking</span>
          <span><Clock size={16} /> Time rules and restrictions</span>
        </div>
      </div>

      <div className="empty">
        <strong>No parking data is live yet.</strong>
        <span>For now, HiStreets focuses on nearby offers, jobs, free meals and community support. Parking will be released later as a checked local feature.</span>
      </div>
    </section>
  )
}
