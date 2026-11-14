import { useI18n } from '../i18n'
import { STATUS_COLOR } from '../content/format'

const SIZE = 260
const C = SIZE / 2
const R = 104
const GAP = 7 // degrés entre deux segments

function polar(angleDeg) {
  const a = ((angleDeg - 90) * Math.PI) / 180
  return [C + R * Math.cos(a), C + R * Math.sin(a)]
}

function arc(start, end) {
  const [x1, y1] = polar(start)
  const [x2, y2] = polar(end)
  const large = end - start > 180 ? 1 : 0
  return `M ${x1.toFixed(2)} ${y1.toFixed(2)} A ${R} ${R} 0 ${large} 1 ${x2.toFixed(2)} ${y2.toFixed(2)}`
}

// Élément signature : un segment par indicateur, coloré selon son état. Cliquer un segment sélectionne l'indicateur.
export default function ReadinessRing({ indicators, fitness, selected, onSelect }) {
  const { t } = useI18n()
  const n = indicators.length
  const step = 360 / n
  const inRange = indicators.filter((i) => i.status === 'normal').length
  const centerColor = fitness === 'fit' ? STATUS_COLOR.normal : fitness === 'watch' ? STATUS_COLOR.watch : STATUS_COLOR.alert

  return (
    <svg viewBox={`0 0 ${SIZE} ${SIZE}`} className="mx-auto w-full max-w-[17rem]" role="group" aria-label={t('ring.title')}>
      <circle cx={C} cy={C} r={R - 22} fill="none" stroke="#1f2b45" strokeWidth="1" strokeDasharray="2 5" />
      {indicators.map((it, idx) => {
        const start = idx * step + GAP / 2
        const end = (idx + 1) * step - GAP / 2
        const d = arc(start, end)
        const active = it.indicator === selected
        const keyDown = (e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault()
            onSelect(it.indicator)
          }
        }
        return (
          <g
            key={it.indicator}
            role="button"
            tabIndex={0}
            aria-label={`${it.label} : ${t(`status.${it.status}`)}`}
            aria-pressed={active}
            onClick={() => onSelect(it.indicator)}
            onKeyDown={keyDown}
            className="cursor-pointer outline-none [&:focus-visible_path:last-child]:stroke-white"
          >
            <title>{`${it.label} : ${t(`status.${it.status}`)}`}</title>
            <path d={d} fill="none" stroke="transparent" strokeWidth="30" />
            <path
              d={d}
              fill="none"
              stroke={STATUS_COLOR[it.status]}
              strokeWidth={active ? 17 : 11}
              strokeLinecap="round"
              opacity={active ? 1 : 0.8}
              className="transition-all duration-150"
            />
          </g>
        )
      })}
      <text x={C} y={C - 14} textAnchor="middle" fontSize="12" fill="#8d99b8">
        {t('fit.title')}
      </text>
      <text x={C} y={C + 10} textAnchor="middle" fontSize="19" fontWeight="650" fill={centerColor}>
        {t(`fit.${fitness}`)}
      </text>
      <text x={C} y={C + 34} textAnchor="middle" fontSize="12" fill="#8d99b8" className="font-mono">
        {`${inRange}/${n} ${t('ring.inRange')}`}
      </text>
    </svg>
  )
}
