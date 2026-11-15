import { useCallback, useEffect, useState } from 'react'
import { api, CAPS, USE_MOCK } from './api'
import { useI18n } from './i18n'
import Icon from './components/Icon'
import Login from './components/Login'
import Dashboard from './components/Dashboard'
import BodyMap from './components/BodyMap'
import MeasureForm from './components/MeasureForm'
import GroundView from './components/GroundView'
import SecurityPanel from './components/SecurityPanel'

const SESSION_KEY = 'ahm_session'
const ENVS = ['iss', 'moon', 'mars']

// Onglets visibles selon le rôle. ⚠️ Ce n'est que de l'affichage : le backend refuse (403) tout accès non autorisé.
const ALL_TABS = {
  astronaut: ['dashboard', 'body', 'log', 'ground', 'security'],
  flight_surgeon: ['ground'],
  commander: ['ground'],
}
// Les onglets dont le backend n'a pas encore les routes sont masqués (voir CAPS dans api/client.js)
const TABS = Object.fromEntries(
  Object.entries(ALL_TABS).map(([r, list]) => [r, list.filter((id) => CAPS[id] !== false)]),
)

function loadSession() {
  try {
    const s = JSON.parse(sessionStorage.getItem(SESSION_KEY))
    if (s?.token && s?.role) return s
  } catch {
    /* pas de session */
  }
  return null
}

export default function App() {
  const { t, lang, setLang } = useI18n()
  const [session, setSession] = useState(() => {
    const s = loadSession()
    if (s) api.setToken(s.token)
    return s
  })
  const [tab, setTab] = useState(() => (session ? TABS[session.role][0] : 'dashboard'))
  const [env, setEnv] = useState(() => {
    try {
      return localStorage.getItem('ahm_env') || 'mars'
    } catch {
      return 'mars'
    }
  })
  const [status, setStatus] = useState(null)
  const [measures, setMeasures] = useState([])
  const [integrity, setIntegrity] = useState(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)

  const role = session?.role

  const logout = useCallback(() => {
    api.logout?.()
    sessionStorage.removeItem(SESSION_KEY)
    api.setToken(null)
    setSession(null)
    setStatus(null)
    setMeasures([])
    setIntegrity(null)
  }, [])

  // Un 401 renvoyé par l'API (jeton expiré) ramène à l'écran de connexion
  useEffect(() => {
    api.setUnauthorizedHandler(logout)
  }, [logout])

  function handleLogin(s) {
    api.setToken(s.token)
    sessionStorage.setItem(SESSION_KEY, JSON.stringify(s))
    setSession(s)
    setTab(TABS[s.role][0])
  }

  // Chargement des données de l'astronaute : 3 appels en parallèle (état, historique, intégrité)
  const load = useCallback(async () => {
    if (role !== 'astronaut') return
    setLoading(true)
    setError(null)
    try {
      const [st, ms, ver] = await Promise.all([api.getStatus(lang), api.getMeasures(), api.verifyIntegrity()])
      setStatus(st)
      setMeasures(ms)
      setIntegrity(ver)
    } catch (e) {
      if (e.status !== 401) setError(e.message || t('error.generic'))
    } finally {
      setLoading(false)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [role, lang])

  useEffect(() => {
    load()
  }, [load])

  function changeEnv(value) {
    setEnv(value)
    try {
      localStorage.setItem('ahm_env', value)
    } catch {
      /* ignoré */
    }
  }

  const langButton = (
    <button type="button" className="btn btn-ghost btn-sm" onClick={() => setLang(lang === 'fr' ? 'en' : 'fr')} aria-label="Language">
      {t('lang.switch')}
    </button>
  )

  if (!session) {
    return (
      <div className="mx-auto min-h-screen max-w-6xl px-4 py-5 sm:px-6">
        <header className="flex items-center justify-between gap-4">
          <Brand t={t} />
          {langButton}
        </header>
        <main>
          <Login onLogin={handleLogin} />
        </main>
        <Footer t={t} />
      </div>
    )
  }

  const tabs = TABS[role]
  const compromised = integrity && !integrity.valid

  return (
    <div className="min-h-screen lg:grid lg:grid-cols-[14.5rem_minmax(0,1fr)]">
      <aside className="sidebar flex flex-col gap-4 px-4 py-4 lg:sticky lg:top-0 lg:h-screen">
        <Brand t={t} />
        {tabs.length > 1 && (
          <nav aria-label="Navigation" className="-mx-1 flex gap-1 overflow-x-auto px-1 lg:flex-col lg:overflow-visible">
            {tabs.map((id) => (
              <button
                key={id}
                type="button"
                aria-current={tab === id ? 'page' : undefined}
                onClick={() => setTab(id)}
                className={`flex shrink-0 cursor-pointer items-center gap-3 rounded-control px-3 py-2 text-sm font-medium transition-colors ${
                  tab === id ? 'bg-raised text-fg' : 'text-mute hover:bg-raised/60 hover:text-fg'
                }`}
              >
                <Icon name={id} />
                {t(`nav.${id}`)}
              </button>
            ))}
          </nav>
        )}
        <div className="hidden text-xs text-mute lg:mt-auto lg:block">
          {USE_MOCK ? t('login.mock') : 'API : /api'}
        </div>
      </aside>

      <div className="min-w-0">
        <header className="flex flex-wrap items-center justify-between gap-3 border-b border-edge-strong bg-panel px-4 py-3 sm:px-6">
          <label className="flex items-center gap-2 text-sm text-mute">
            {t('env.label')}
            <select className="field w-auto" value={env} onChange={(e) => changeEnv(e.target.value)}>
              {ENVS.map((e) => (
                <option key={e} value={e}>
                  {t(`env.${e}`)}
                </option>
              ))}
            </select>
          </label>
          <div className="flex flex-wrap items-center gap-2">
            {role === 'astronaut' && (
              <button type="button" className="btn btn-ghost btn-sm" onClick={load} disabled={loading}>
                <Icon name="refresh" className="size-3.5" />
                {t('refresh')}
              </button>
            )}
            <span className="rounded-sm border border-edge-strong px-3 py-1 text-xs font-medium">{t(`role.${role}`)}</span>
            {langButton}
            <button type="button" className="btn btn-ghost btn-sm" onClick={logout}>
              <Icon name="logout" className="size-3.5" />
              {t('logout')}
            </button>
          </div>
        </header>

        {compromised && (
          <div className="mx-4 mt-4 flex flex-wrap items-center justify-between gap-3 rounded-panel border border-bad bg-bad/10 px-4 py-3 text-bad sm:mx-6" role="alert">
            <strong className="font-semibold">⚠ {t('banner.integrity')}</strong>
            <button type="button" className="btn btn-danger btn-sm" onClick={() => setTab('security')}>
              {t('banner.goSecurity')}
            </button>
          </div>
        )}

        <main className="space-y-4 px-4 py-6 sm:px-6">
          <p className="max-w-prose text-sm text-mute">{t(`env.tip.${env}`)}</p>

          {error && <p className="text-bad" role="alert">{error}</p>}
          {role === 'astronaut' && !status && !error && <p className="text-mute">{t('loading')}</p>}

          {role === 'astronaut' && status && tab === 'dashboard' && (
            <Dashboard status={status} measures={measures} onGoLog={() => setTab('log')} />
          )}
          {role === 'astronaut' && status && tab === 'body' && <BodyMap status={status} />}
          {role === 'astronaut' && status && tab === 'log' && <MeasureForm indicators={status.indicators} onSaved={load} />}
          {role === 'astronaut' && tab === 'security' && (
            <SecurityPanel measures={measures} integrity={integrity} onRefresh={load} />
          )}
          {tab === 'ground' && <GroundView role={role} env={env} />}
        </main>
      </div>
    </div>
  )
}

function Brand({ t }) {
  return (
    <div className="flex items-center gap-3">
      <svg viewBox="0 0 32 32" className="size-9 shrink-0" aria-hidden="true">
        <rect x="1.5" y="1.5" width="29" height="29" rx="3" fill="#0b4aa2" stroke="#e8eef5" strokeWidth="1.5" />
        <path d="M4 18h6l3-8 5 13 3-7h7" fill="none" stroke="#fff" strokeWidth="2.2" strokeLinecap="square" strokeLinejoin="miter" />
      </svg>
      <div className="min-w-0">
        <h1 className="font-display text-xl font-semibold leading-none tracking-wide">{t('app.title')}</h1>
        <p className="hidden text-xs leading-snug text-mute sm:block">{t('app.subtitle')}</p>
      </div>
    </div>
  )
}

function Footer({ t }) {
  return (
    <footer className="mt-16 text-center text-xs text-mute">
      {USE_MOCK ? t('login.mock') : 'API : /api'} — NASA Space Apps Challenge 2026
    </footer>
  )
}
