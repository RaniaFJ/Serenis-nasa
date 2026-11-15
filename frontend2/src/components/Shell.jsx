import { ENVIRONMENTS } from '../data/serenisDb';
import { useMission } from '../context/MissionContext';

const APP_NAME = 'Sentra';

const NAV_ITEMS = [
  { id: 'dashboard', label: 'Dashboard', icon: '◎' },
  { id: 'body', label: 'Scanner Corps', icon: '🧍' },
  { id: 'measure', label: 'Saisie guidée', icon: '🩺' },
  { id: 'detail', label: 'Courbes', icon: '📈' },
  { id: 'alerts', label: 'Alertes & Mars', icon: '🚨' },
  { id: 'hazards', label: 'Dangers & XP', icon: '☄' },
];

function SpaceBackground() {
  return (
    <div className="space-bg" aria-hidden="true">
      <div className="stars" />
      <div className="planet" />
      <div className="moon" />
      <div className="shooting" />
    </div>
  );
}

export default function Shell({ children }) {
  const {
    envId, setEnvId, env, globalScore, alerts,
    offlineMode, setOfflineMode, pendingSync, syncOfflineQueue,
    activeTab, setActiveTab, simulateEmergency, resetNominal,
  } = useMission();

  const scoreTone =
    globalScore >= 85 ? 'text-emerald-300' : globalScore >= 65 ? 'text-amber-300' : 'text-rose-300';
  const scoreIcon = globalScore >= 85 ? '✓' : globalScore >= 65 ? '⚠' : '✖';

  return (
    <div className="min-h-screen pb-12 text-slate-100">
      <SpaceBackground />

      <header className="sticky top-0 z-30 border-b border-white/10 bg-slate-950/70 backdrop-blur-xl">
        <div className="mx-auto flex max-w-7xl flex-col gap-3 px-4 py-3 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex items-center gap-3">
            <div className="grid h-11 w-11 place-items-center rounded-full bg-gradient-to-br from-cyan-300 via-sky-500 to-violet-500 text-lg shadow-[0_0_22px_rgba(34,211,238,0.45)]">
              🛰
            </div>
            <div>
              <div className="font-serif text-[2rem] italic leading-none text-white">{APP_NAME}</div>
              <div className="mt-1 font-mono text-[10px] uppercase tracking-[0.2em] text-slate-400">
                Mission Control
              </div>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2 lg:flex-nowrap">
            <div className="flex items-center gap-3 rounded-full border border-white/10 bg-slate-900/60 px-4 py-2 font-mono text-xs text-slate-300">
              <span>
                SCORE <b className={scoreTone}>{scoreIcon} {globalScore}%</b>
              </span>
              <span className="h-3 w-px bg-white/15" />
              <span>
                TERRE <b className="text-amber-300">{env.commDelaySec >= 60 ? `${Math.round(env.commDelaySec / 60)} min` : `${env.commDelaySec} s`}</b>
              </span>
            </div>

            <select
              value={envId}
              onChange={(e) => setEnvId(e.target.value)}
              aria-label="Choix de l'environnement"
              className="cursor-pointer rounded-full border border-cyan-400/40 bg-slate-950 px-4 py-2.5 text-xs font-semibold text-cyan-200 outline-none md:text-sm"
            >
              {Object.values(ENVIRONMENTS).map((e) => (
                <option key={e.id} value={e.id}>
                  🌍 {e.name}
                </option>
              ))}
            </select>

            <button
              onClick={() => (offlineMode ? syncOfflineQueue() : setOfflineMode(true))}
              className={`cursor-pointer rounded-full border px-4 py-2.5 font-mono text-xs font-bold transition ${
                offlineMode
                  ? 'border-amber-400 bg-amber-500/20 text-amber-300'
                  : 'border-white/10 bg-slate-900/60 text-emerald-300 hover:border-emerald-400/50'
              }`}
            >
              {offlineMode ? `📴 HORS-LIGNE · ${pendingSync} en attente` : '📡 SYNCHRO'}
            </button>

            <button
              onClick={simulateEmergency}
              className="cursor-pointer rounded-full border border-rose-400/50 bg-rose-500/20 px-4 py-2.5 font-mono text-xs font-bold text-rose-200 transition hover:bg-rose-500/35"
            >
              ✖ Crise
            </button>
            <button
              onClick={resetNominal}
              className="cursor-pointer rounded-full border border-white/10 bg-slate-900/60 px-4 py-2.5 font-mono text-xs text-slate-300 transition hover:bg-slate-800"
            >
              ✓ Nominal
            </button>
          </div>
        </div>

        <nav className="mx-auto flex max-w-7xl gap-1.5 overflow-x-auto px-4 pb-3" aria-label="Navigation principale">
          {NAV_ITEMS.map((item) => {
            const hasAlerts = item.id === 'alerts' && alerts.length > 0;
            const active = activeTab === item.id;
            return (
              <button
                key={item.id}
                onClick={() => setActiveTab(item.id)}
                aria-current={active ? 'page' : undefined}
                className={`flex shrink-0 cursor-pointer items-center gap-2 rounded-full border px-5 py-3 text-sm font-medium transition ${
                  active
                    ? 'glow-cyan border-cyan-400/60 bg-cyan-400/15 text-white'
                    : 'border-transparent text-slate-300 hover:border-white/15 hover:bg-white/5'
                }`}
              >
                <span aria-hidden>{item.icon}</span>
                <span>{item.label}</span>
                {hasAlerts && (
                  <span className="rounded-full bg-rose-500 px-1.5 py-0.5 font-mono text-[10px] text-white">{alerts.length}</span>
                )}
              </button>
            );
          })}
        </nav>
      </header>

      <main key={activeTab} className="fade-in mx-auto max-w-7xl px-4 pt-6">
        {children}
      </main>
    </div>
  );
}