import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'

type Report = { id: string; kind: string; target_id: string | null; reason: string; details: string; snapshot: string; created_at: string }
export default function AdminReports() {
  const [reports, setReports] = useState<Report[]>([])
  const [message, setMessage] = useState('')
  const [working, setWorking] = useState(false)
  async function load() {
    if (!supabase) return
    const { data, error } = await supabase.from('content_reports').select('id,kind,target_id,reason,details,snapshot,created_at').eq('status', 'open').order('created_at', { ascending: true }).limit(100)
    if (error) setMessage('Reports could not be loaded. Please try again.')
    else { setReports(data || []); setMessage('') }
  }
  useEffect(() => { void load() }, [])
  async function resolve(report: Report, action: 'dismiss' | 'remove') {
    if (!supabase || working) return
    if (!window.confirm(action === 'remove' ? 'Remove this reported content from public view?' : 'Mark this report as reviewed without removing content?')) return
    setWorking(true)
    try {
      const { error } = await supabase.rpc('resolve_content_report', { p_report_id: report.id, p_action: action })
      if (error) throw error
      await load()
    } catch { setMessage('Action failed. The report remains open; please try again.') }
    finally { setWorking(false) }
  }
  return <section className="privacy-card"><h2>Content reports</h2><p>Review every report. Removing a business also removes its public posts. AI reports should inform response safeguards.</p>
    <button type="button" onClick={() => void load()} disabled={working}>Refresh reports</button>
    {message && <p role="alert">{message}</p>}
    {!message && reports.length === 0 && <p>No open reports.</p>}
    {reports.map(report => <article className="report-review" key={report.id}>
      <h3>{report.kind}: {report.reason}</h3><p>{new Date(report.created_at).toLocaleString()}</p>
      <p>{report.details || 'No additional details'}</p>
      {report.snapshot && <pre>{report.snapshot}</pre>}
      {report.target_id && <p>Reference: {report.target_id}</p>}
      <div className="content-safety-actions">
        {report.kind !== 'ai' && <button type="button" disabled={working} onClick={() => void resolve(report, 'remove')}>Remove reported content</button>}
        <button type="button" disabled={working} onClick={() => void resolve(report, 'dismiss')}>Mark reviewed</button>
      </div>
    </article>)}
  </section>
}
