import { useEffect, useRef, useState } from 'react'
import { api } from '../api'
import { useI18n } from '../i18n'
import StatusBadge from './StatusBadge'
import { STATUS_STYLE, formatDelay, formatTime } from '../content/format'

const TRANSIT_MS = 2200 // animation de démo ; le vrai délai est affiché en texte

// Liaison Terre-vaisseau : le sol ne reçoit qu'un résumé (statuts), jamais les valeurs brutes.
// Chaque rôle voit un contenu différent (le backend filtre, le front affiche).
export default function GroundView({ role, env }) {
  const { t, lang } = useI18n()
  const [packet, setPacket] = useState(null)
  const [transit, setTransit] = useState(false)
  const [error, setError] = useState(null)
  const timer = useRef(null)

  useEffect(() => () => clearTimeout(timer.current), [])

  async function send() {
    setError(null)
    setPacket(null)
    setTransit(true)
    try {
      const data = await api.getGroundSummary(env, lang)
      timer.current = setTimeout(() => {
        setPacket(data)
        setTransit(false)
      }, TRANSIT_MS)
    } catch (e) {
      setTransit(false)
      setError(e.message || t('error.generic'))
    }
  }

  const fact = (label, value, mono = false) => (
    <div>
      <dt className="text-xs text-mute">{label}</dt>
      <dd className={`mt-0.5 ${mono ? 'font-mono text-sm' : ''}`}>{value}</dd>
    </div>
  )

  return (
    <div className="space-y-6">
      <section className="panel">
        <h3 className="text-base">{t('ground.title')}</h3>
        <p className="mt-1 max-w-prose text-sm text-mute">{t('ground.hint')}</p>

        <div className="my-6 flex items-center gap-4" aria-hidden="true">
          <span className="text-3xl">🚀</span>
          <div className="relative h-0.5 flex-1 bg-[repeating-linear-gradient(90deg,var(--color-edge-strong)_0_8px,transparent_8px_14px)]">
            {transit && (
              <span
                className="absolute -top-1.5 left-0 size-3.5 rounded-full bg-sig shadow-[0_0_12px_var(--color-sig)]"
                style={{ animation: `transit ${TRANSIT_MS}ms linear forwards` }}
              />
            )}
          </div>
          <span className="text-3xl">🌍</span>
        </div>

        <button type="button" className="btn btn-primary" onClick={send} disabled={transit}>
          {transit ? t('ground.transit') : role === 'astronaut' ? t('ground.send') : t('ground.receive')}
        </button>
        {error && <p className="mt-3 text-sm text-bad" role="alert">{error}</p>}
      </section>

      {packet && (
        <section className="panel">
          <h3 className="text-base">
            {t(`fit.${packet.fitness}`)} <span className="text-sm font-normal text-mute">({t('fit.title')})</span>
          </h3>
          <dl className="my-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {fact(t('ground.seq'), packet.seq, true)}
            {fact(t('ground.delay'), formatDelay(packet.delay_seconds, lang))}
            {fact(t('ground.sent'), formatTime(packet.generated_at, lang), true)}
            {fact(t('ground.received'), formatTime(packet.received_at, lang), true)}
            {fact(t('ground.encrypted'), packet.encrypted ? '🔒' : '—')}
            {fact(
              t('ground.sig'),
              <span className={packet.signature_valid ? 'text-ok' : 'font-medium text-bad'}>
                {packet.signature_valid ? `✔ ${t('ground.sigOk')}` : `✖ ${t('ground.sigBad')}`}
              </span>,
            )}
            {fact(t('ground.payload'), `${packet.payload_hash.slice(0, 20)}…`, true)}
          </dl>

          {packet.indicators && (
            <>
              <h4 className="section-title mb-2">{t('ground.content')}</h4>
              <ul className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
                {packet.indicators.map((i) => (
                  <li key={i.indicator} className="flex items-center justify-between gap-2 rounded-control border border-edge px-3 py-2">
                    <span>{i.label}</span>
                    <StatusBadge status={i.status} />
                  </li>
                ))}
              </ul>
              {packet.alerts?.length > 0 && (
                <ul className="mt-4 space-y-2">
                  {packet.alerts.map((a, idx) => (
                    <li key={idx} className="flex items-center gap-3">
                      <span className={`h-5 w-1 rounded-full ${STATUS_STYLE[a.level].bar}`} aria-hidden="true" />
                      <StatusBadge status={a.level} /> {a.title}
                    </li>
                  ))}
                </ul>
              )}
            </>
          )}
        </section>
      )}
    </div>
  )
}
