import { useState } from 'react'
import { useI18n } from '../i18n'
import { ZONES } from '../content/bodyZones'
import { STATUS_COLOR, formatValue, worstStatus } from '../content/format'
import StatusBadge from './StatusBadge'

// Silhouette cliquable : chaque zone prend la couleur du pire état de ses indicateurs (/status).
export default function BodyMap({ status }) {
  const { t, lang } = useI18n()
  const [zoneId, setZoneId] = useState(null)

  const byKey = Object.fromEntries(status.indicators.map((i) => [i.indicator, i]))
  const zoneStatus = (id) => {
    const keys = ZONES[id].indicators
    return keys.length ? worstStatus(keys.map((k) => byKey[k]?.status || 'nodata')) : 'nodata'
  }

  const Zone = ({ id, children }) => {
    const st = zoneStatus(id)
    const color = ZONES[id].indicators.length ? STATUS_COLOR[st] : '#6fd3ff'
    return (
      <g
        className={`zone ${zoneId === id ? 'is-active' : ''}`}
        style={{ '--zone': color }}
        role="button"
        tabIndex={0}
        aria-label={ZONES[id][lang].name}
        aria-pressed={zoneId === id}
        onClick={() => setZoneId(id)}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault()
            setZoneId(id)
          }
        }}
      >
        {children}
      </g>
    )
  }

  const zone = zoneId ? ZONES[zoneId] : null

  return (
    <div className="grid gap-6 md:grid-cols-[minmax(16rem,22rem)_minmax(0,1fr)]">
      <div className="panel text-center">
        <p className="mb-2 text-sm text-mute">{t('body.hint')}</p>
        <svg viewBox="0 0 200 430" className="mx-auto h-auto w-full max-w-[18rem]" role="group" aria-label={t('body.title')}>
          <g className="silhouette">
            <circle cx="100" cy="48" r="30" />
            <rect x="90" y="74" width="20" height="18" rx="6" />
            <path d="M58 98 Q100 84 142 98 L150 205 Q100 222 50 205 Z" />
            <rect x="26" y="100" width="22" height="120" rx="11" transform="rotate(8 37 100)" />
            <rect x="152" y="100" width="22" height="120" rx="11" transform="rotate(-8 163 100)" />
            <rect x="62" y="205" width="32" height="200" rx="15" />
            <rect x="106" y="205" width="32" height="200" rx="15" />
          </g>

          <Zone id="brain"><ellipse cx="100" cy="36" rx="22" ry="16" /></Zone>
          <Zone id="eyes">
            <ellipse cx="89" cy="56" rx="8" ry="5" />
            <ellipse cx="111" cy="56" rx="8" ry="5" />
          </Zone>
          <Zone id="immune"><ellipse cx="80" cy="128" rx="15" ry="26" /></Zone>
          <Zone id="heart"><circle cx="112" cy="132" r="14" /></Zone>
          <Zone id="metabolism"><ellipse cx="100" cy="182" rx="30" ry="18" /></Zone>
          <Zone id="bones">
            <rect x="68" y="230" width="20" height="150" rx="10" />
            <rect x="112" y="230" width="20" height="150" rx="10" />
            <rect x="96" y="100" width="8" height="70" rx="4" />
          </Zone>
        </svg>
      </div>

      <div className="panel">
        {!zone ? (
          <p className="text-mute">{t('body.select')}</p>
        ) : (
          <div className="max-w-prose space-y-4">
            <h3 className="text-lg">{zone[lang].name}</h3>
            <div>
              <h4 className="section-title mb-1">{t('body.function')}</h4>
              <p>{zone[lang].function}</p>
            </div>
            <div>
              <h4 className="section-title mb-1">{t('body.risk')}</h4>
              <p>{zone[lang].risk}</p>
            </div>
            <div>
              <h4 className="section-title mb-2">{t('body.indicators')}</h4>
              {zone.indicators.length === 0 ? (
                <p className="text-mute">{t('body.noIndicators')}</p>
              ) : (
                <ul className="divide-y divide-edge border-y border-edge">
                  {zone.indicators.map((k) => {
                    const it = byKey[k]
                    if (!it) return null
                    return (
                      <li key={k} className="flex flex-wrap items-center justify-between gap-3 py-2">
                        <span>{it.label}</span>
                        <span className="flex items-center gap-3">
                          <span className="font-mono tabular-nums">
                            {formatValue(it.latest, it.decimals, k)} <span className="text-xs text-mute">{it.unit}</span>
                          </span>
                          <StatusBadge status={it.status} />
                        </span>
                      </li>
                    )
                  })}
                </ul>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
