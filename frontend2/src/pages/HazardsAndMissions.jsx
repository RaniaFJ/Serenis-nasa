import { NASA_HAZARDS, INDICATORS_CATALOG, ACHIEVEMENTS } from '../data/serenisDb';
import { useMission } from '../context/MissionContext';
import StatusBadge from '../components/StatusBadge';

export default function HazardsAndMissions() {
  const {
    indicatorStatuses,
    tasks,
    toggleTask,
    totalXp,
    setSelectedIndicatorId,
    setActiveTab,
  } = useMission();

  const xpPercent = Math.min(100, Math.round((totalXp % 500) / 5));

  return (
    <div className="space-y-8">
      <section className="bg-slate-900/90 border border-cyan-500/20 rounded-2xl p-6 space-y-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="text-2xl font-bold text-white">Missions & Gamification Équipage</h2>
            <p className="text-xs text-slate-400 font-mono">
              NIVEAU 4 • SÉRIE ACTIVE : <span className="text-amber-400 font-bold">14 JOURS 🔥</span>
            </p>
          </div>
          <div className="text-right">
            <div className="text-2xl font-bold font-mono text-cyan-300">{totalXp} XP</div>
            <div className="text-xs text-slate-400">Prochain grade à 500 XP</div>
          </div>
        </div>

        <div className="w-full h-4 bg-slate-950 rounded-full overflow-hidden border border-slate-800">
          <div
            className="h-full bg-gradient-to-r from-cyan-500 to-emerald-400 transition-all"
            style={{ width: `${xpPercent}%` }}
          />
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          {ACHIEVEMENTS.map((b) => (
            <div
              key={b.id}
              className={`p-4 rounded-xl border flex items-center gap-3 ${
                b.unlocked
                  ? 'bg-cyan-500/10 border-cyan-400/50 text-white'
                  : 'bg-slate-950/60 border-slate-800 text-slate-500'
              }`}
            >
              <span className="text-2xl">{b.icon}</span>
              <div>
                <div className="font-bold text-sm">{b.title}</div>
                <div className="text-xs">{b.desc}</div>
              </div>
            </div>
          ))}
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-2">
          {tasks.map((t) => (
            <button
              key={t.id}
              onClick={() => toggleTask(t.id)}
              className={`p-4 rounded-xl border text-left flex items-center justify-between cursor-pointer ${
                t.done
                  ? 'bg-emerald-500/10 border-emerald-500/40 text-slate-400 line-through'
                  : 'bg-slate-950 border-slate-800 text-white hover:border-cyan-400'
              }`}
            >
              <span className="text-sm font-semibold">
                {t.done ? '✓ ' : '⬜ '} {t.title}
              </span>
              <span className="text-xs font-mono text-cyan-300">+{t.xp} XP</span>
            </button>
          ))}
        </div>
      </section>

      <section className="space-y-4">
        <div>
          <h2 className="text-2xl font-bold text-white">Les 5 Dangers du Vol Spatial (NASA HRP)</h2>
          <p className="text-xs text-slate-400">
            Cliquez sur un indicateur lié pour inspecter son impact en temps réel.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {NASA_HAZARDS.map((h) => (
            <div
              key={h.id}
              className="bg-slate-900/90 border border-cyan-500/20 rounded-2xl p-5 flex flex-col justify-between space-y-4"
            >
              <div>
                <h3 className="text-base font-bold text-cyan-300 mb-1">{h.title}</h3>
                <p className="text-sm text-slate-300 mb-3">{h.summary}</p>
                <div className="text-xs bg-slate-950 border border-slate-800 rounded-xl p-3 text-slate-200">
                  <span className="font-bold text-emerald-400">✓ Contre-mesure :</span> {h.countermeasure}
                </div>
              </div>

              <div className="flex flex-wrap gap-2 pt-2 border-t border-slate-800">
                {h.affectedIndicators.map((indId) => {
                  const ind = INDICATORS_CATALOG[indId];
                  return (
                    <button
                      key={indId}
                      onClick={() => {
                        setSelectedIndicatorId(indId);
                        setActiveTab('detail');
                      }}
                      className="px-3 py-2 rounded-xl bg-slate-950 border border-slate-700 hover:border-cyan-400 text-xs font-bold text-white flex items-center gap-2 cursor-pointer"
                    >
                      <span>{ind.name}</span>
                      <StatusBadge status={indicatorStatuses[indId]} />
                    </button>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}