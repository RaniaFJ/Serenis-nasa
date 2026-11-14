// Utilitaires d'affichage partagés par les composants.

export const STATUS_COLOR = {
  normal: '#3fd99a',
  watch: '#ffb347',
  alert: '#ff5f6d',
  nodata: '#6b7aa6',
}

// Icône + texte en plus de la couleur : lisible aussi pour les daltoniens.
export const STATUS_ICON = { normal: '●', watch: '▲', alert: '✖', nodata: '○' }

// Classes Tailwind écrites en entier (Tailwind ne détecte pas les noms de classes assemblés dynamiquement).
export const STATUS_STYLE = {
  normal: {
    badge: 'bg-ok/10 text-ok ring-ok/30',
    text: 'text-ok',
    bar: 'bg-ok',
    border: 'border-ok/50',
    callout: 'border-ok/40 bg-ok/5',
  },
  watch: {
    badge: 'bg-warn/10 text-warn ring-warn/30',
    text: 'text-warn',
    bar: 'bg-warn',
    border: 'border-warn/50',
    callout: 'border-warn/40 bg-warn/5',
  },
  alert: {
    badge: 'bg-bad/10 text-bad ring-bad/35',
    text: 'text-bad',
    bar: 'bg-bad',
    border: 'border-bad/60',
    callout: 'border-bad/50 bg-bad/8',
  },
  nodata: {
    badge: 'bg-mute/10 text-mute ring-mute/25',
    text: 'text-mute',
    bar: 'bg-mute/40',
    border: 'border-edge-strong',
    callout: 'border-edge-strong bg-raised',
  },
}

export const worstStatus = (list) => {
  if (list.includes('alert')) return 'alert'
  if (list.includes('watch')) return 'watch'
  if (list.includes('normal')) return 'normal'
  return 'nodata'
}

export function formatValue(latest, decimals = 0, indicator) {
  if (!latest) return '—'
  if (indicator === 'blood_pressure' && latest.value2 != null) return `${latest.value}/${latest.value2}`
  return Number(latest.value).toFixed(decimals)
}

export const todayISO = () => {
  const d = new Date()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${d.getFullYear()}-${m}-${day}`
}

export const shortDate = (iso) => iso.slice(5) // MM-DD

export function formatDelay(seconds, lang) {
  if (seconds < 60) return `${seconds.toLocaleString(lang)} s`
  return `${Math.round(seconds / 60)} min`
}

export function formatTime(iso, lang) {
  return new Date(iso).toLocaleTimeString(lang, { hour: '2-digit', minute: '2-digit', second: '2-digit' })
}

// Série de jours consécutifs où les 7 indicateurs ont été saisis (en partant d'aujourd'hui, ou d'hier si aujourd'hui est incomplet).
export function computeStreak(measures, total = 7) {
  const byDate = {}
  for (const m of measures) (byDate[m.date] ||= new Set()).add(m.indicator)
  const complete = (iso) => (byDate[iso]?.size || 0) >= total
  const cursor = new Date()
  cursor.setHours(0, 0, 0, 0)
  const iso = (d) =>
    `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
  if (!complete(iso(cursor))) cursor.setDate(cursor.getDate() - 1)
  let streak = 0
  while (complete(iso(cursor))) {
    streak += 1
    cursor.setDate(cursor.getDate() - 1)
  }
  return streak
}

export function missingToday(measures, keys) {
  const today = todayISO()
  const done = new Set(measures.filter((m) => m.date === today).map((m) => m.indicator))
  return keys.filter((k) => !done.has(k))
}

// Dernière mesure de chaque jour (évite plusieurs points le même jour sur les courbes)
export function dailySeries(measures, indicator, days) {
  const byDate = new Map()
  for (const m of measures) if (m.indicator === indicator) byDate.set(m.date, m)
  const rows = [...byDate.values()].sort((a, b) => (a.date < b.date ? -1 : 1))
  return rows.slice(-days)
}
