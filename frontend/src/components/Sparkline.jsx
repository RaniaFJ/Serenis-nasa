// Mini courbe SVG sans dépendance, pour les lignes d'instruments.
export default function Sparkline({ values, color, className = 'h-7 w-full' }) {
  if (!values || values.length < 2) return <svg className={className} viewBox="0 0 100 28" aria-hidden="true" />
  const min = Math.min(...values)
  const max = Math.max(...values)
  const span = max - min || 1
  const pts = values
    .map((v, i) => {
      const x = (i / (values.length - 1)) * 100
      const y = 24 - ((v - min) / span) * 20
      return `${x.toFixed(1)},${y.toFixed(1)}`
    })
    .join(' ')
  const last = pts.split(' ').pop().split(',')
  return (
    <svg className={className} viewBox="0 0 100 28" preserveAspectRatio="none" aria-hidden="true">
      <polyline points={pts} fill="none" stroke={color} strokeWidth="1.8" vectorEffect="non-scaling-stroke" />
      <circle cx={last[0]} cy={last[1]} r="2.4" fill={color} />
    </svg>
  )
}
