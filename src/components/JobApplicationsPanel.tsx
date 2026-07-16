import { useEffect, useState } from 'react'
import { Briefcase, FileText, Mail, MessageCircle, Phone } from 'lucide-react'
import { loadMyJobApplications } from '../lib/data'
import type { JobApplication } from '../types'

function whatsappUrl(phone: string) {
  const digits = phone.replace(/[^0-9]/g, '')
  return digits ? `https://wa.me/${digits.startsWith('44') ? digits : digits.startsWith('0') ? `44${digits.slice(1)}` : digits}` : '#'
}

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

  return <div className="privacy-card"><h2><Briefcase size={20} /> Job applications</h2><p className="muted">Applications from people who applied in the app. Contact applicants directly by email, phone or WhatsApp to give the result.</p>{status && <p className="form-status">{status}</p>}{items.map(item => <article className="post-card" key={item.id}><div><Briefcase size={20} /></div><div><h3>{item.job_title}</h3><p><strong>{item.applicant_name}</strong> applied to {item.business_name}</p><div className="post-meta"><span><Mail size={14} /> {item.applicant_email}</span><span><Phone size={14} /> {item.applicant_phone}</span></div>{item.cover_note && <p>{item.cover_note}</p>}<div className="applicant-actions"><a href={`mailto:${item.applicant_email}?subject=${encodeURIComponent(`Your application for ${item.job_title}`)}`}><Mail size={16} /> Email result</a><a href={`tel:${item.applicant_phone}`}><Phone size={16} /> Call</a><a href={whatsappUrl(item.applicant_phone)} target="_blank" rel="noreferrer"><MessageCircle size={16} /> WhatsApp</a><a href={item.cv_url} target="_blank" rel="noreferrer"><FileText size={16} /> Open CV</a></div></div></article>)}</div>
}
