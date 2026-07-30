import { Briefcase, HandHeart, Megaphone, Utensils } from 'lucide-react'
import type { PostType } from '../types'

type Props = {
  onPost: (type: PostType) => void
}

export default function BusinessPostingDashboard({ onPost }: Props) {
  return (
    <div className="privacy-card business-dashboard">
      <h2>Post from an approved business</h2>
      <p className="muted">Once your business is approved and connected to your account, publish local updates from here. Public users never see these posting controls.</p>
      <div className="business-action-grid">
        <button type="button" onClick={() => onPost('offer')}><Megaphone size={18} /> Post offer</button>
        <button type="button" onClick={() => onPost('job')}><Briefcase size={18} /> Post job</button>
        <button type="button" onClick={() => onPost('free_meal')}><Utensils size={18} /> Post free meal</button>
        <button type="button" onClick={() => onPost('community')}><HandHeart size={18} /> Post community support</button>
      </div>
      <p className="missing-note">No approved business yet? Complete the registration or ownership request above. Verified businesses can publish posts that pass the platform checks automatically.</p>
    </div>
  )
}
