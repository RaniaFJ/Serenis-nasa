import {
  CartesianGrid,
  Line,
  LineChart,
  ReferenceArea,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'
import { useI18n } from '../i18n'
import { CHART, STATUS_COLOR, dailySeries, shortDate } from '../content/format'

export default function TrendChart({ item, measures, days }) {
  const { t } = useI18n()
  const rows = dailySeries(measures, item.indicator, days)
  const isBP = item.indicator === 'blood_pressure'
  const data = rows.map((m) => ({
    date: shortDate(m.date),
    value: m.value,
    value2: m.value2,
    status: m.status,
  }))

  const vals = data.flatMap((d) => [d.value, d.value2].filter((v) => v != null))
  const [nLo, nHi] = item.thresholds.normal
  const lo = Math.min(...vals, nLo)
  const hi = Math.max(...vals, Math.min(nHi, Math.max(...vals) * 1.3))
  const pad = (hi - lo) * 0.12 || 1
  const domain =
    item.decimals === 0
      ? [Math.floor(lo - pad), Math.ceil(hi + pad)]
      : [Math.floor((lo - pad) * 10) / 10, Math.ceil((hi + pad) * 10) / 10]
  const tick = (v) => Number(v).toFixed(item.decimals)

  const dot = (color) =>
    function Dot({ cx, cy, payload, index }) {
      if (cx == null || cy == null) return null
      return <circle key={index} cx={cx} cy={cy} r={3.5} fill={color || STATUS_COLOR[payload.status]} />
    }

  return (
    <div role="img" aria-label={`${item.label}, ${data.length} ${t('dash.days')}`}>
      <ResponsiveContainer width="100%" height={280}>
        <LineChart data={data} margin={{ top: 8, right: 12, bottom: 0, left: -8 }}>
          <CartesianGrid stroke={CHART.grid} strokeDasharray="3 3" />
          <XAxis dataKey="date" stroke={CHART.axis} tick={{ fontSize: 11 }} minTickGap={16} />
          <YAxis stroke={CHART.axis} tick={{ fontSize: 11 }} domain={domain} tickFormatter={tick} allowDataOverflow />
          <ReferenceArea
            y1={nLo}
            y2={nHi}
            ifOverflow="hidden"
            fill={STATUS_COLOR.normal}
            fillOpacity={0.1}
            stroke={STATUS_COLOR.normal}
            strokeOpacity={0.35}
            strokeDasharray="4 4"
          />
          <Tooltip
            contentStyle={{ background: CHART.tipBg, border: `1px solid ${CHART.tipBorder}`, borderRadius: 3, color: CHART.fg }}
            labelStyle={{ color: CHART.axis }}
            formatter={(v, name) => [`${v} ${item.unit}`, name === 'value2' ? (isBP ? 'dia' : name) : isBP ? 'sys' : item.label]}
          />
          <Line type="monotone" dataKey="value" stroke={CHART.line} strokeWidth={2} dot={dot()} activeDot={{ r: 5 }} isAnimationActive={false} />
          {isBP && (
            <Line type="monotone" dataKey="value2" stroke={CHART.line2} strokeWidth={2} dot={dot(CHART.line2)} isAnimationActive={false} />
          )}
        </LineChart>
      </ResponsiveContainer>
      <p className="mt-1 flex items-center gap-2 text-xs text-mute">
        <span className="inline-block h-2.5 w-4 border border-dashed border-ok bg-ok/20" aria-hidden="true" />
        {t('dash.normalZone')}
        {isBP && <span>(sys / dia)</span>}
      </p>
    </div>
  )
}
