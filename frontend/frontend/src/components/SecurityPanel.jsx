import { useCallback, useEffect, useState } from 'react'
import { api } from '../api'
import { useI18n } from '../i18n'
import { formatTime } from '../content/format'

const SEVERITY_TEXT = { critical: 'text-bad', warn: 'text-warn', info: 'text-fg' }

// Panneau sécurité : vérification d'intégrité, simulation d'attaque (démo jury), journal d'audit.
export default function SecurityPanel({ measures, integrity, onRefresh }) {
  const { t, lang } = useI18n()
  const [audit, setAudit] = useState([])
  const [busy, setBusy] = useState(false)
  const [message, setMessage] = useState(null)
  const [error, setError] = useState(null)

  const loadAudit = useCallback(async () => {
    try {
      setAudit(await api.getAuditLog())
    } catch (e) {
      setError(e.message)
    }
  }, [])

  useEffect(() => {
    loadAudit()
  }, [loadAudit, integrity])

  async function run(fn) {
    setBusy(true)
    setError(null)
    setMessage(null)
    try {
      const res = await fn()
      if (res && res.detail) setMessage(res.detail)
      await onRefresh()
      await loadAudit()
    } catch (e) {
      setError(e.message || t('error.generic'))
    } finally {
      setBusy(false)
    }
  }

  const chain = measures.slice(-10)
  const valid = integrity?.valid

  return (
    <div className="space-y-6">
      <section className="panel">
        <h3 className="text-base">{t('sec.title')}</h3>
        <p className="mt-1 max-w-prose text-sm text-mute">{t('sec.intro')}</p>

        <div
          className={`mt-4 rounded-control border p-4 ${valid ? 'border-ok/40 bg-ok/5' : 'border-bad/60 bg-bad/10'}`}
          role="status"
        >
          <p className={`font-semibold ${valid ? 'text-ok' : 'text-bad'}`}>
            {valid ? `✔ ${t('sec.valid')}` : `✖ ${t('sec.broken')} #${integrity?.broken_at}`}
          </p>
          {integrity && (
            <p className="mt-0.5 text-sm text-mute">
              {integrity.checked} {t('sec.checked')}
            </p>
          )}
        </div>

        <button type="button" className="btn btn-primary mt-4" disabled={busy} onClick={() => run(() => api.verifyIntegrity())}>
          {t('sec.verify')}
        </button>
      </section>

      <section className="panel border-bad/30">
        <h3 className="text-base">{t('sec.attack')}</h3>
        <div className="mt-4 grid gap-6 sm:grid-cols-3">
          <div>
            <button type="button" className="btn btn-danger" disabled={busy} onClick={() => run(() => api.attack('tamper'))}>
              {t('sec.tamper')}
            </button>
            <p className="mt-2 text-sm text-mute">{t('sec.tamperDesc')}</p>
          </div>
          <div>
            <button type="button" className="btn btn-danger" disabled={busy} onClick={() => run(() => api.attack('replay'))}>
              {t('sec.replay')}
            </button>
            <p className="mt-2 text-sm text-mute">{t('sec.replayDesc')}</p>
          </div>
          <div>
            <button type="button" className="btn btn-ghost" disabled={busy} onClick={() => run(() => api.resetDemo())}>
              {t('sec.reset')}
            </button>
          </div>
        </div>
        {message && <p className="mt-4 rounded-control border border-warn/40 bg-warn/5 p-3 text-sm" role="status">{message}</p>}
        {error && <p className="mt-4 text-sm text-bad" role="alert">{error}</p>}
      </section>

      <section className="panel">
        <h3 className="mb-3 text-base">{t('sec.chain')}</h3>
        <div className="overflow-x-auto">
          <table className="w-full border-collapse font-mono text-xs">
            <thead>
              <tr>
                <th className="th">#</th>
                <th className="th">{t('form.indicator')}</th>
                <th className="th">{t('form.value')}</th>
                <th className="th">prev_hash</th>
                <th className="th">hash</th>
              </tr>
            </thead>
            <tbody>
              {chain.map((m) => {
                const broken = integrity && !integrity.valid && m.id === integrity.broken_at
                return (
                  <tr key={m.id} className={broken ? 'bg-bad/15 text-bad' : ''}>
                    <td className="td">{m.id}</td>
                    <td className="td">{m.indicator}</td>
                    <td className="td">{m.value2 != null ? `${m.value}/${m.value2}` : m.value}</td>
                    <td className="td">{m.prev_hash.slice(0, 10)}…</td>
                    <td className="td">{m.hash.slice(0, 10)}…</td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </section>

      <section className="panel">
        <h3 className="mb-3 text-base">{t('sec.audit')}</h3>
        <div className="overflow-x-auto">
          <table className="w-full border-collapse text-sm">
            <thead>
              <tr>
                <th className="th">{t('sec.col.time')}</th>
                <th className="th">{t('sec.col.type')}</th>
                <th className="th">{t('sec.col.detail')}</th>
              </tr>
            </thead>
            <tbody>
              {audit.slice(0, 12).map((e, i) => (
                <tr key={`${e.ts}-${i}`} className={SEVERITY_TEXT[e.severity] || ''}>
                  <td className="td font-mono text-xs">{formatTime(e.ts, lang)}</td>
                  <td className="td font-mono text-xs">{e.type}</td>
                  <td className="td">{e.detail}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <section className="panel">
        <h3 className="mb-3 text-base">{t('sec.threats')}</h3>
        <ul className="list-disc space-y-1.5 pl-5 text-sm">
          {['t1', 't2', 't3', 't4', 't5'].map((k) => (
            <li key={k}>{t(`sec.${k}`)}</li>
          ))}
        </ul>
      </section>
    </div>
  )
}
