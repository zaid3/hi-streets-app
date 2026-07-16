import { Briefcase, Car, HandHeart, Map, Tag, UserCircle } from 'lucide-react'
import type { TabKey } from '../types'

const tabs: Array<{ key: TabKey; label: string; icon: typeof Map }> = [
  { key: 'map', label: 'Map', icon: Map },
  { key: 'offers', label: 'Offers', icon: Tag },
  { key: 'jobs', label: 'Jobs', icon: Briefcase },
  { key: 'community', label: 'Community', icon: HandHeart },
  { key: 'parking', label: 'Parking', icon: Car },
  { key: 'profile', label: 'Profile', icon: UserCircle },
]

export default function BottomTabs({ active, onChange }: { active: TabKey; onChange: (tab: TabKey) => void }) {
  return (
    <nav className="bottom-tabs" aria-label="HiStreets navigation">
      {tabs.map(({ key, label, icon: Icon }) => (
        <button key={key} className={active === key ? 'active' : ''} onClick={() => onChange(key)} aria-label={label}>
          <Icon size={21} />
          <span>{label}</span>
        </button>
      ))}
    </nav>
  )
}
