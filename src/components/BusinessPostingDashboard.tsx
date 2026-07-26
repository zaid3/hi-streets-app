import { Briefcase, HandHeart, Megaphone, Utensils } from 'lucide-react'
import type { PostType } from '../types'

type Props = {
  onPost: (type: PostType) => void
}

export default function BusinessPostingDashboard({ onPost }: Props) {
  return (
    <div className="privacy-card business-dashboard">
      <h2>Post from an approved business</h2>
      <p className="muted">After your business is approved or connected to your account, use these simple buttons to post on HiStreets. Public users do not see these posting buttons.</p>
      <div className="business-action-grid">
        <button type="button" onClick={() => onPost('offer')}><Megaphone size={18} /> Post offer</button>
        <button type="button" onClick={() => onPost('job')}><Briefcase size={18} /> Post job</button>
        <button type="button" onClick={() => onPost('free_meal')}><Utensils size={18} /> Post free meal</button>
        <button type="button" onClick={() => onPost('community')}><HandHeart size={18} /> Post community support</button>
      </div>
      <p className="missing-note">No approved business yet? Use “Register or claim your business” below first. Verified businesses can publish safe posts automatically.</p>
    </div>
  )
}