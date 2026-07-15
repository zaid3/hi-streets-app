import { useEffect, useState } from 'react'
import { Briefcase, FileText, Mail, Phone } from 'lucide-react'
import { loadMyJobApplications } from '../lib/data'
import type { JobApplication } from '../types'

export default function JobApplicationsPanel() {
  const [items, setItems] = useState<JobApplication[]>([])
  const [status, setStatus] = useState('Loading job applications…')

  async function refresh() {
    try {
      const rows = await loadMyJobApplications()
      setItems(rows)
      setStatus(rows.length ? '' : 'No job applications yet.')
    } catch {
      setStatus('Could not load job applications.')
    }
  }

  useEffect(() => { refresh() }, [])

  return <div className="privacy-card"><h2><Briefcase size={20} /> Job applications</h2><p className="muted">Applications from people who applied in the app. They do not need an account, but CV is mandatory.</p>{status && <p className="form-status">{status}</p>}{items.map(item => <article className="post-card" key={item.id}><div><Briefcase size={20} /></div><div><h3>{item.job_title}</h3><p><strong>{item.applicant_name}</strong> applied to {item.business_name}</p><div className="post-meta"><span><Mail size={14} /> {item.applicant_email}</span><span><Phone size={14} /> {item.applicant_phone}</span></div>{item.cover_note && <p>{item.cover_note}</p>}<a href={item.cv_url} target="_blank" rel="noreferrer"><FileText size={16} /> Open CV</a></div></article>)}</div>
}
