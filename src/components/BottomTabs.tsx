import { Briefcase, Car, HandHeart, MapPin, Tag, UserCircle } from 'lucide-react'
import type { TabKey } from '../types'

const tabs: Array<{ key: TabKey; label: string; icon: typeof MapPin }> = [
  { key: 'map', label: 'Near me', icon: MapPin },
  { key: 'offers', label: 'Offers', icon: Tag },
  { key: 'jobs', label: 'Jobs', icon: Briefcase },
  { key: 'community', label: 'Community', icon: HandHeart },
  { key: 'parking', label: 'Parking', icon: Car },
  { key: 'profile', label: 'Business', icon: UserCircle },
]

export default function BottomTabs({ active, onChange }: { active: TabKey; onChange: (tab: TabKey) => void }) {
  return (
    <nav className="bottom-tabs" aria-label="HiStreets navigation">
      {tabs.map(({ key, label, icon: Icon }) => (
        <button key={key} className={active === key ? 'active' : ''} onClick={() => onChange(key)} aria-label={label}>
          <Icon size={20} />
          <span>{label}</span>
        </button>
      ))}
    </nav>
  )
}
