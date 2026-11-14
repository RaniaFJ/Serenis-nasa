import { useState } from 'react'
import { useI18n } from '../i18n'
import IndicatorRow from './IndicatorRow'
import ReadinessRing from './ReadinessRing'
import TrendChart from './TrendChart'
import AdvicePanel from './AdvicePanel'
import StatusBadge from './StatusBadge'
import { STATUS_STYLE, computeStreak, missingToday } from '../content/format'

const RANGES = [7, 14, 30]

export default function Dashboard({ status, measures, onGoLog }) {
  const { t } = useI18n()
  const [selected, setSelected] = useState(status.indicators[0].indicator)
  const [days, setDays] = useState(14)

  const item = status.indicators.find((i) => i.indicator === selected) || status.indicators[0]
  const keys = status.indicators.map((i) => i.indicator)
  const streak = computeStreak(measures, keys.length)
  const missing = missingToday(measures, keys)
  const labelOf = (k) => status.indicators.find((i) => i.indicator === k)?.label || k

  const badges = [
    { id: 'week', ok: streak >= 7, label: t('badge.week'), icon: '🛰️' },
    { id: 'month', ok: streak >= 30, label: t('badge.month'), icon: '🚀' },
    { id: 'full', ok: missing.length === 0, label: t('badge.full'), icon: '⭐' },
  ]

  return (
    <div className="space-y-6">
      <section className="grid gap-6 lg:grid-cols-[21rem_minmax(0,1fr)]">
        <div className="panel lg:self-start">
          <h3 className="section-title mb-2">{t('ring.title')}</h3>
          <ReadinessRing indicators={status.indicators} fitness={status.fitness} selected={selected} onSelect={setSelected} />
          <ul className="mt-4 flex flex-wrap justify-center gap-x-4 gap-y-1 text-xs text-mute">
            {['normal', 'watch', 'alert'].map((st) => (
              <li key={st} className="flex items-center gap-1.5">
                <span className={`size-2 rounded-full ${STATUS_STYLE[st].bar}`} aria-hidden="true" />
                <span className="font-mono text-fg">{status.indicators.filter((i) => i.status === st).length}</span>
                {t(`status.${st}`)}
              </li>
            ))}
          </ul>
        </div>

        <div className="flex flex-col gap-6">
          <div className="panel flex-1">
            <h3 className="mb-3 text-base">{t('dash.alerts')}</h3>
            {status.alerts.length === 0 ? (
              <p className="text-mute">{t('dash.noAlerts')}</p>
            ) : (
              <ul className="space-y-3">
                {status.alerts.map((a) => (
                  <li key={a.id} className="flex gap-3">
                    <span className={`mt-1 w-1 shrink-0 rounded-full ${STATUS_STYLE[a.level].bar}`} aria-hidden="true" />
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2 font-medium">
                        {a.title} <StatusBadge status={a.level} />
                      </div>
                      <p className="mt-0.5 text-sm text-mute">{a.detail}</p>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </div>

          <div className="panel">
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div>
                <h3 className="section-title">{t('dash.streak')}</h3>
                <p className="mt-1 flex items-baseline gap-2">
                  <span className="font-mono text-3xl font-medium tabular-nums">{streak}</span>
                  <span className="text-sm text-mute">{t('dash.streakDays')}</span>
                </p>
              </div>
              <ul className="flex gap-2" aria-label={t('dash.badges')}>
                {badges.map((b) => (
                  <li
                    key={b.id}
                    title={b.ok ? b.label : t('badge.locked')}
                    className={`flex w-20 flex-col items-center gap-1 rounded-control border px-1 py-2 text-center text-xs ${
                      b.ok ? 'border-sig/40 bg-sig/5' : 'border-dashed border-edge-strong opacity-45 grayscale'
                    }`}
                  >
                    <span aria-hidden="true" className="text-lg">{b.icon}</span>
                    {b.label}
                  </li>
                ))}
              </ul>
            </div>
            <div className="mt-4 flex flex-wrap items-center justify-between gap-3 border-t border-edge pt-4 text-sm">
              {missing.length === 0 ? (
                <p className="text-mute">{t('dash.allDone')}</p>
              ) : (
                <>
                  <p>
                    <span className="text-mute">{t('dash.missing')} : </span>
                    {missing.map(labelOf).join(', ')}
                  </p>
                  <button type="button" className="btn btn-ghost btn-sm" onClick={onGoLog}>
                    {t('dash.goLog')}
                  </button>
                </>
              )}
            </div>
          </div>
        </div>
      </section>

      <section className="panel overflow-hidden p-0">
        <h3 className="border-b border-edge px-5 py-3 text-base">{t('dash.indicators')}</h3>
        {status.indicators.map((it) => (
          <IndicatorRow key={it.indicator} item={it} measures={measures} selected={it.indicator === selected} onSelect={setSelected} />
        ))}
      </section>

      <section className="panel">
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
          <h3 className="text-base">
            {t('dash.detail')} : {item.label}
          </h3>
          <div className="inline-flex overflow-hidden rounded-control border border-edge-strong" role="group" aria-label={t('dash.range')}>
            {RANGES.map((d) => (
              <button
                key={d}
                type="button"
                onClick={() => setDays(d)}
                aria-pressed={days === d}
                className={`cursor-pointer px-3 py-1.5 text-xs ${days === d ? 'bg-raised text-fg' : 'text-mute hover:text-fg'}`}
              >
                {d} {t('dash.days')}
              </button>
            ))}
          </div>
        </div>
        <div className="grid gap-8 xl:grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)]">
          <TrendChart item={item} measures={measures} days={days} />
          <AdvicePanel indicator={item.indicator} status={item.status} />
        </div>
      </section>
    </div>
  )
}
