import { useState } from 'react'
import { SHOW_DEMO_ACCOUNTS, api } from '../api'
import { useI18n } from '../i18n'

// Comptes de test : affichés seulement en démo (voir SHOW_DEMO_ACCOUNTS dans api/index.js).
const DEMO = [
  { user: 'astro', pass: 'astro123', role: 'astronaut' },
  { user: 'surgeon', pass: 'surgeon123', role: 'flight_surgeon' },
  { user: 'commander', pass: 'cmd123', role: 'commander' },
]

export default function Login({ onLogin }) {
  const { t } = useI18n()
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState(null)

  async function submit(e) {
    e.preventDefault()
    setBusy(true)
    setError(null)
    try {
      const session = await api.login(username.trim(), password)
      onLogin(session)
    } catch (err) {
      setError(err.status === 401 ? t('login.error') : err.message || t('error.generic'))
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="mx-auto mt-10 w-full max-w-md space-y-4 sm:mt-20">
      <form className="panel space-y-4" onSubmit={submit}>
        <h2 className="text-xl">{t('login.title')}</h2>
        <label className="label">
          {t('login.user')}
          <input className="field" value={username} onChange={(e) => setUsername(e.target.value)} autoComplete="username" required autoFocus />
        </label>
        <label className="label">
          {t('login.pass')}
          <input className="field" type="password" value={password} onChange={(e) => setPassword(e.target.value)} autoComplete="current-password" required />
        </label>
        <button type="submit" className="btn btn-primary w-full" disabled={busy}>
          {busy ? t('loading') : t('login.submit')}
        </button>
        {error && <p className="text-sm text-bad" role="alert">{error}</p>}
      </form>

      {SHOW_DEMO_ACCOUNTS && (
        <div className="rounded-panel border border-dashed border-edge-strong p-4 text-sm">
          <h3 className="mb-2 font-medium text-mute">{t('login.demo')}</h3>
          <ul className="space-y-2">
            {DEMO.map((d) => (
              <li key={d.user}>
                <button
                  type="button"
                  className="cursor-pointer font-medium text-sig underline-offset-2 hover:underline"
                  onClick={() => {
                    setUsername(d.user)
                    setPassword(d.pass)
                  }}
                >
                  {t(`role.${d.role}`)}
                </button>
                <span className="ml-2 font-mono text-xs text-mute">{d.user} / {d.pass}</span>
                <span className="block text-xs text-mute">{t(`role.hint.${d.role}`)}</span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  )
}
