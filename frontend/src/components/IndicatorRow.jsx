import { useI18n } from '../i18n'
import StatusBadge from './StatusBadge'
import Sparkline from './Sparkline'
import { STATUS_COLOR, STATUS_STYLE, dailySeries, formatValue } from '../content/format'

const TREND_ARROW = { up: '↗', down: '↘', flat: '→' }

// Une ligne d'instrument : barre d'état, nom, valeur, courbe des 14 derniers jours, état.
export default function IndicatorRow({ item, measures, selected, onSelect }) {
  const { t } = useI18n()
  const series = dailySeries(measures, item.indicator, 14).map((m) => m.value)
  return (
    <button
      type="button"
      onClick={() => onSelect(item.indicator)}
      aria-pressed={selected}
      className={`group relative grid w-full cursor-pointer grid-cols-[1fr_auto] items-center gap-x-4 gap-y-1 border-b border-edge px-4 py-3 text-left transition-colors last:border-b-0 sm:grid-cols-[minmax(0,1.3fr)_minmax(0,1fr)_7rem_8.5rem] ${
        selected ? 'bg-raised' : 'hover:bg-raised/60'
      }`}
    >
      <span className={`absolute inset-y-0 left-0 w-1 ${STATUS_STYLE[item.status].bar}`} aria-hidden="true" />
      <span className="min-w-0 pl-2">
        <span className="block truncate font-medium">{item.label}</span>
        {item.latest && <span className="block text-xs text-mute">{item.latest.date}</span>}
      </span>
      <span className="flex items-baseline justify-end gap-1.5 sm:justify-start">
        <span className="font-display text-3xl font-semibold leading-none tabular-nums">{formatValue(item.latest, item.decimals, item.indicator)}</span>
        <span className="text-xs text-mute">{item.unit}</span>
        <span className={`ml-1 text-sm ${STATUS_STYLE[item.status].text}`} title={t(`dash.trend.${item.trend}`)}>
          {TREND_ARROW[item.trend]}
        </span>
      </span>
      <span className="hidden sm:block">
        <Sparkline values={series} color={STATUS_COLOR[item.status]} />
      </span>
      <span className="col-span-2 sm:col-span-1 sm:justify-self-end">
        <StatusBadge status={item.status} />
      </span>
    </button>
  )
}
