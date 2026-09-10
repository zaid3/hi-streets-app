type Series = { label: string; values: number[]; color: string }

export default function AnalyticsSparkline({ labels, series, ariaLabel }: { labels: string[]; series: Series[]; ariaLabel: string }) {
  const width = 720
  const height = 220
  const pad = 24
  const max = Math.max(1, ...series.flatMap(item => item.values))
  const x = (index: number) => pad + index * ((width - pad * 2) / Math.max(1, labels.length - 1))
  const y = (value: number) => height - pad - (value / max) * (height - pad * 2)
  const points = (values: number[]) => values.map((value, index) => `${x(index)},${y(value)}`).join(' ')

  return <div className="analytics-chart-wrap">
    <svg className="analytics-chart" viewBox={`0 0 ${width} ${height}`} role="img" aria-label={ariaLabel} preserveAspectRatio="none">
      {[0, .25, .5, .75, 1].map(level => <line key={level} x1={pad} x2={width - pad} y1={y(max * level)} y2={y(max * level)} className="chart-grid-line" />)}
      {series.map(item => <polyline key={item.label} points={points(item.values)} fill="none" stroke={item.color} strokeWidth="4" strokeLinecap="round" strokeLinejoin="round" />)}
    </svg>
    <div className="analytics-legend">{series.map(item => <span key={item.label}><i style={{ background: item.color }} />{item.label}</span>)}</div>
    <div className="chart-date-row"><span>{labels[0] ? new Date(labels[0]).toLocaleDateString(undefined, { day: 'numeric', month: 'short' }) : ''}</span><span>{labels.length ? new Date(labels[labels.length - 1]).toLocaleDateString(undefined, { day: 'numeric', month: 'short' }) : ''}</span></div>
  </div>
}
