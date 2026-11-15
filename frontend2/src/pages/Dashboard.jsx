import { ResponsiveContainer, AreaChart, Area } from 'recharts';
import { INDICATORS_CATALOG } from '../data/serenisDb';
import { useMission } from '../context/MissionContext';
import StatusBadge, { getStatusMeta } from '../components/StatusBadge';

function ScoreRing({ score, status }) {
  const r = 62;
  const c = 2 * Math.PI * r;
  const meta = getStatusMeta(status);
  return (
    <div className="relative mx-auto h-44 w-44 shrink-0">
      <svg viewBox="0 0 160 160" className="h-full w-full -rotate-90">
        <circle cx="80" cy="80" r={r} fill="none" stroke="rgba(255,255,255,0.08)" strokeWidth="10" />
        <circle
          cx="80"
          cy="80"
          r={r}
          fill="none"
          stroke={meta.hex}
          strokeWidth="10"
          strokeLinecap="round"
          strokeDasharray={c}
          strokeDashoffset={c * (1 - score / 100)}
          style={{ transition: 'stroke-dashoffset .9s ease', filter: `drop-shadow(0 0 8px ${meta.hex})` }}
        />
      </svg>
      <div className="absolute inset-0 grid place-items-center text-center">
        <div>
          <div className="font-mono text-4xl font-bold text-white">{score}</div>
          <div className={`font-mono text-[10px] tracking-[0.2em] ${meta.textClass}`}>
            {meta.icon} {meta.label}
          </div>
        </div>
      </div>
    </div>
  );
}

export default function Dashboard() {
  const {
    env,
    values,
    histories,
    indicatorStatuses,
    alerts,
    globalScore,
    tasks,
    toggleTask,
    totalXp,
    setSelectedIndicatorId,
    setActiveTab,
  } = useMission();

  const dueIndicators = Object.values(INDICATORS_CATALOG).filter(
    (ind) => ind.lastMeasuredHoursAgo >= ind.frequencyHours
  );

  const openDetail = (id) => {
    setSelectedIndicatorId(id);
    setActiveTab('detail');
  };

  const scoreStatus = globalScore >= 85 ? 'GREEN' : globalScore >= 65 ? 'AMBER' : 'RED';
  const headline =
    globalScore >= 85
      ? 'Tous les systèmes sont stables.'
      : globalScore >= 65
      ? 'Quelques indicateurs demandent votre attention.'
      : 'Situation critique : suivez le protocole.';

  return (
    <div className="space-y-6">
      <section className="hero grid items-center gap-6 p-6 md:grid-cols-[auto_1fr] md:p-8">
        <ScoreRing score={globalScore} status={scoreStatus} />
        <div>
          <div className="eyebrow">{env.name} · Jour de mission 14</div>
          <h2 className="mt-2 text-white" style={{ fontSize: '2.6rem', lineHeight: 1.05 }}>
            {headline}
          </h2>
          <p className="mt-3 max-w-xl text-sm text-slate-300">
            Sentra surveille vos constantes, les relie aux 5 dangers du vol spatial et vous guide pas à pas,
            même quand la Terre met{' '}
            {env.commDelaySec >= 60 ? `${Math.round(env.commDelaySec / 60)} minutes` : `${env.commDelaySec} secondes`} à répondre.
          </p>
          <div className="mt-4 flex flex-wrap gap-2 font-mono text-xs">
            <span className="rounded-full border border-white/10 bg-white/5 px-3 py-1.5">⚖ {env.gravity}</span>
            <span className="rounded-full border border-white/10 bg-white/5 px-3 py-1.5">📡 {env.commLabel}</span>
            <span
              className={`rounded-full border px-3 py-1.5 ${
                alerts.length
                  ? 'border-rose-400/50 bg-rose-500/15 text-rose-200'
                  : 'border-emerald-400/40 bg-emerald-500/10 text-emerald-200'
              }`}
            >
              {alerts.length ? `✖ ${alerts.length} alerte(s)` : '✓ 0 alerte'}
            </span>
            <span className="rounded-full border border-cyan-400/40 bg-cyan-400/10 px-3 py-1.5 text-cyan-200">
              ★ {totalXp} XP
            </span>
          </div>
        </div>
      </section>

      {alerts.length > 0 ? (
        <div className="pulse-red bg-rose-950/50 border-2 border-rose-500/60 rounded-2xl p-4 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="text-xs font-mono text-rose-300 uppercase font-bold">
              ✖ {alerts.length} ALERTE(S) ACTIVE(S) — INTERVENTION REQUISE
            </div>
            <div className="text-base md:text-lg font-bold text-white mt-0.5">{alerts[0].title}</div>
          </div>
          <button
            onClick={() => setActiveTab('alerts')}
            className="py-3 px-5 rounded-xl bg-rose-600 hover:bg-rose-500 text-white font-bold text-sm cursor-pointer shrink-0"
          >
            Voir les Conseils & Médecin →
          </button>
        </div>
      ) : (
        <div className="bg-emerald-950/40 border border-emerald-500/40 rounded-2xl p-4 flex items-center justify-between">
          <div className="text-sm md:text-base font-bold text-emerald-300">
            ✓ Tous les systèmes physiologiques sont nominaux pour la mission en cours.
          </div>
          <span className="text-xs font-mono text-emerald-400">STATUT : VERT</span>
        </div>
      )}

      {dueIndicators.length > 0 && (
        <div className="bg-amber-950/40 border border-amber-500/40 rounded-2xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="text-xs md:text-sm text-amber-200">
            <span className="font-bold">⚠ Rappel de mesure due :</span>{' '}
            {dueIndicators.map((d) => `${d.name} (toutes les ${d.frequencyHours}h)`).join(' • ')}
          </div>
          <button
            onClick={() => {
              setSelectedIndicatorId(dueIndicators[0].id);
              setActiveTab('measure');
            }}
            className="py-2.5 px-4 rounded-xl bg-amber-500/20 border border-amber-400 text-amber-200 font-bold text-xs cursor-pointer shrink-0"
          >
            🩺 Mesurer maintenant
          </button>
        </div>
      )}

      <section>
        <div className="flex items-center justify-between mb-3">
          <h2 className="eyebrow">
            Télémesure Physiologique (Cliquer sur une carte pour l’analyse détaillée)
          </h2>
          <span className="text-xs font-mono text-slate-400">Score Santé : {globalScore}%</span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {Object.values(INDICATORS_CATALOG).map((ind) => {
            const status = indicatorStatuses[ind.id];
            const meta = getStatusMeta(status);
            const data = histories[ind.id] || [];
            const isDue = ind.lastMeasuredHoursAgo >= ind.frequencyHours;

            return (
              <div
                key={ind.id}
                onClick={() => openDetail(ind.id)}
                className={`bg-slate-900/90 border-2 ${meta.borderClass} rounded-2xl p-4 cursor-pointer hover:-translate-y-1 hover:brightness-125 transition-all duration-200 flex flex-col justify-between`}
              >
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <div className="text-xs font-mono text-slate-400 flex items-center gap-2">
                      <span>{ind.name}</span>
                      {isDue && (
                        <span className="text-[10px] px-1.5 py-0.5 rounded bg-amber-500/20 text-amber-300">
                          ⏰ DÛ
                        </span>
                      )}
                    </div>
                    <div className={`text-2xl md:text-3xl font-bold font-mono mt-1 ${meta.textClass}`}>
                      {values[ind.id]}{' '}
                      <span className="text-xs font-normal text-slate-400">{ind.unit}</span>
                    </div>
                  </div>
                  <StatusBadge status={status} />
                </div>

                <div className="h-14 w-full mt-3">
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={data}>
                      <Area
                        type="monotone"
                        dataKey="val"
                        stroke={meta.hex}
                        strokeWidth={2}
                        fill={meta.hex}
                        fillOpacity={0.18}
                      />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
              </div>
            );
          })}
        </div>
      </section>

      <section className="bg-slate-900/90 border border-cyan-500/20 rounded-2xl p-5">
        <div className="flex flex-wrap items-center justify-between gap-2 mb-4">
          <div>
            <h2 className="text-base font-bold text-white">Contre-mesures & Tâches du Jour</h2>
            <p className="text-xs text-slate-400 font-mono">
              SÉRIE : <span className="text-amber-400 font-bold">14 JOURS</span> • XP TOTAL :{' '}
              <span className="text-cyan-300 font-bold">{totalXp} XP</span>
            </p>
          </div>
          <button
            onClick={() => setActiveTab('measure')}
            className="py-3 px-4 rounded-xl bg-cyan-500/20 border border-cyan-400 text-cyan-200 text-xs font-bold cursor-pointer"
          >
            + Nouvelle Saisie Guidée
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {tasks.map((t) => (
            <button
              key={t.id}
              onClick={() => toggleTask(t.id)}
              className={`p-4 rounded-xl border text-left flex items-center justify-between transition cursor-pointer ${
                t.done
                  ? 'bg-emerald-500/10 border-emerald-500/40 text-slate-400 line-through'
                  : 'bg-slate-950 border-slate-800 text-white hover:border-cyan-400'
              }`}
            >
              <span className="text-sm font-medium">
                {t.done ? '✓ ' : '⬜ '} {t.title}
              </span>
              <span className="text-xs font-mono px-2.5 py-1 rounded-lg bg-cyan-500/15 text-cyan-300">
                +{t.xp} XP
              </span>
            </button>
          ))}
        </div>
      </section>
    </div>
  );
}