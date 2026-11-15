import {
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  ReferenceArea,
} from 'recharts';
import { INDICATORS_CATALOG } from '../data/serenisDb';
import { useMission } from '../context/MissionContext';
import StatusBadge, { getStatusMeta } from '../components/StatusBadge';

export default function IndicatorDetail() {
  const {
    values,
    histories,
    indicatorStatuses,
    alerts,
    globalScore,
    env,
    selectedIndicatorId,
    setSelectedIndicatorId,
    setActiveTab,
  } = useMission();

  const ind = INDICATORS_CATALOG[selectedIndicatorId] || INDICATORS_CATALOG.hr;
  const data = histories[ind.id] || [];
  const status = indicatorStatuses[ind.id];
  const meta = getStatusMeta(status);
  const th = ind.getThresholds(env);

  const last = data[data.length - 1]?.val ?? values[ind.id];
  const prev = data[data.length - 2]?.val ?? last;
  const trend = last > prev ? '↗ En hausse' : last < prev ? '↘ En baisse' : '→ Stable';

  const allIndicators = Object.values(INDICATORS_CATALOG);
  const scoreStatus = globalScore >= 85 ? 'GREEN' : globalScore >= 65 ? 'AMBER' : 'RED';
  const scoreMeta = getStatusMeta(scoreStatus);

  const statusCounts = {
    GREEN: allIndicators.filter((item) => indicatorStatuses[item.id] === 'GREEN').length,
    AMBER: allIndicators.filter((item) => indicatorStatuses[item.id] === 'AMBER').length,
    RED: allIndicators.filter((item) => indicatorStatuses[item.id] === 'RED').length,
  };

  const contributingIndicators = allIndicators.filter(
    (item) => indicatorStatuses[item.id] === 'AMBER' || indicatorStatuses[item.id] === 'RED'
  );

  return (
    <div className="space-y-6">
      <section className="rounded-2xl border border-cyan-500/20 bg-slate-900/90 p-5">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <h2 className="text-xl font-bold text-white">Health Assessment</h2>
            <p className="mt-1 text-sm text-slate-400">
              Assessment calculated from the nine recorded indicators.
            </p>
          </div>
          <StatusBadge status={scoreStatus} />
        </div>

        <div className="mt-5 grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div className="rounded-xl border border-slate-700 bg-slate-950 p-4">
            <p className="text-xs font-mono uppercase text-slate-400">Overall health score</p>
            <div className={`mt-2 text-4xl font-bold font-mono ${scoreMeta.textClass}`}>
              {globalScore}<span className="text-lg text-slate-400"> / 100</span>
            </div>
            <div className="mt-3 h-2 overflow-hidden rounded-full bg-slate-800">
              <div className="h-full rounded-full bg-cyan-400 transition-all"
                style={{ width: `${globalScore}%` }} />
            </div>
          </div>

          <div className="grid grid-cols-3 gap-2">
            <div className="rounded-xl border border-emerald-500/20 bg-emerald-500/10 p-3 text-center">
              <div className="text-2xl font-bold text-emerald-300">{statusCounts.GREEN}</div>
              <div className="text-xs text-emerald-200">Nominal</div>
            </div>
            <div className="rounded-xl border border-amber-500/20 bg-amber-500/10 p-3 text-center">
              <div className="text-2xl font-bold text-amber-300">{statusCounts.AMBER}</div>
              <div className="text-xs text-amber-200">Warning</div>
            </div>
            <div className="rounded-xl border border-rose-500/20 bg-rose-500/10 p-3 text-center">
              <div className="text-2xl font-bold text-rose-300">{statusCounts.RED}</div>
              <div className="text-xs text-rose-200">Critical</div>
            </div>
          </div>
        </div>

        <div className="mt-5 border-t border-slate-700 pt-4">
          <h3 className="font-bold text-white">Factors affecting the score</h3>
          <p className="mt-1 text-xs text-slate-400">
            Application scoring: -7 points for AMBER and -18 points for RED.
          </p>

          {contributingIndicators.length === 0 ? (
            <p className="mt-3 text-sm text-emerald-300">
              All indicators are currently nominal. No score deductions.
            </p>
          ) : (
            <div className="mt-3 space-y-2">
              {contributingIndicators.map((item) => {
                const itemStatus = indicatorStatuses[item.id];
                const deduction = itemStatus === 'RED' ? 18 : 7;

                return (
                  <div key={item.id}
                    className="flex flex-wrap items-center justify-between gap-2 rounded-lg bg-slate-950 p-3">
                    <div>
                      <p className="text-sm font-semibold text-white">{item.name}</p>
                      <p className="text-xs text-slate-400">
                        Current value: {values[item.id]} {item.unit}
                      </p>
                    </div>
                    <div className="flex items-center gap-3">
                      <StatusBadge status={itemStatus} />
                      <span className="text-sm font-bold text-rose-300">-{deduction} pts</span>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        <div className="mt-5 border-t border-slate-700 pt-4">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h3 className="font-bold text-white">Active alerts ({alerts.length})</h3>
            {alerts.length > 0 && (
              <button onClick={() => setActiveTab('alerts')}
                className="rounded-lg border border-rose-400/40 bg-rose-500/10 px-3 py-2 text-xs font-bold text-rose-200">
                View all alerts
              </button>
            )}
          </div>

          {alerts.length === 0 ? (
            <p className="mt-3 text-sm text-emerald-300">No active alerts.</p>
          ) : (
            <div className="mt-3 space-y-3">
              {alerts.map((alert) => (
                <div key={alert.id}
                  className="rounded-xl border border-rose-500/20 bg-rose-950/20 p-3">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <p className="text-sm font-bold text-white">{alert.title}</p>
                    <StatusBadge status={alert.severity} />
                  </div>
                  <p className="mt-2 text-sm leading-relaxed text-slate-300">{alert.action}</p>
                </div>
              ))}
            </div>
          )}
        </div>

        <p className="mt-5 rounded-lg border border-amber-500/20 bg-amber-500/5 p-3 text-xs leading-relaxed text-amber-200">
          Demo data notice: initial measurements are locally initialized example values.
          This score is an application simulation, not a medical diagnosis or verified
          astronaut health assessment.
        </p>
      </section>
      <section className="bg-slate-900/90 border border-cyan-500/20 rounded-2xl p-5">
        <div className="mb-4">
          <h2 className="text-xl font-bold text-white">Physiological Measurements</h2>
          <p className="mt-1 text-sm text-slate-400">
            Current recorded values, status and measurement editing.
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-3">
          {allIndicators.map((item) => {
            const itemStatus = indicatorStatuses[item.id];
            const itemMeta = getStatusMeta(itemStatus);

            return (
              <div
                key={item.id}
                className="rounded-xl border border-slate-700 bg-slate-950 p-4"
              >
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <h3 className="text-sm font-bold text-white">{item.name}</h3>
                    <p className="mt-1 text-xs text-slate-400">{item.unit}</p>
                  </div>
                  <StatusBadge status={itemStatus} />
                </div>

                <div className={`mt-4 text-2xl font-bold font-mono ${itemMeta.textClass}`}>
                  {values[item.id]} <span className="text-sm">{item.unit}</span>
                </div>

                <div className="mt-4 flex gap-2">
                  <button
                    onClick={() => {
                      setSelectedIndicatorId(item.id);
                    }}
                    className="flex-1 rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-xs font-bold text-slate-200 hover:border-cyan-400"
                  >
                    View details
                  </button>

                  <button
                    onClick={() => {
                      setSelectedIndicatorId(item.id);
                      setActiveTab('measure');
                    }}
                    className="flex-1 rounded-lg border border-cyan-400/40 bg-cyan-500/10 px-3 py-2 text-xs font-bold text-cyan-200 hover:bg-cyan-500/20"
                  >
                    Edit measurement
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </section>
      <div className="flex flex-wrap items-center justify-between gap-3 bg-slate-900/90 border border-cyan-500/20 rounded-2xl p-4">
        <select
          value={ind.id}
          onChange={(e) => setSelectedIndicatorId(e.target.value)}
          className="bg-slate-950 border border-slate-700 rounded-xl px-4 py-3 text-base font-bold text-white outline-none"
        >
          {Object.values(INDICATORS_CATALOG).map((item) => (
            <option key={item.id} value={item.id}>
              {item.name} ({item.unit})
            </option>
          ))}
        </select>

        <div className="flex items-center gap-3">
          <span className="text-sm font-mono text-slate-300">Tendance : {trend}</span>
          <StatusBadge status={status} />
          <button
            onClick={() => setActiveTab('measure')}
            className="py-3 px-4 rounded-xl bg-cyan-500/20 border border-cyan-400 text-cyan-200 text-xs font-bold cursor-pointer"
          >
            🩺 Nouvelle mesure
          </button>
        </div>
      </div>

      <div className="bg-slate-900/90 border border-cyan-500/20 rounded-2xl p-5">
        <div className="flex flex-wrap justify-between items-center mb-4 gap-2">
          <h2 className="text-xl font-bold text-white">
            Évolution : {ind.name} — Valeur actuelle :{' '}
            <span className={meta.textClass}>
              {values[ind.id]} {ind.unit}
            </span>
          </h2>
          <span className="text-xs font-mono text-slate-400">
            Seuils calibrés pour : {env.name}
          </span>
        </div>

        <div className="h-72 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={data} margin={{ top: 10, right: 16, left: -10, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(148,163,184,0.15)" />
              <XAxis dataKey="day" stroke="#94a3b8" fontSize={12} />
              <YAxis domain={[th.chartMin, th.chartMax]} stroke="#94a3b8" fontSize={12} />

              {th.invert ? (
                <>
                  <ReferenceArea y1={th.greenMin} y2={th.chartMax} fill="#10b981" fillOpacity={0.14} />
                  <ReferenceArea y1={th.amberMin} y2={th.greenMin} fill="#f59e0b" fillOpacity={0.16} />
                  <ReferenceArea y1={th.chartMin} y2={th.amberMin} fill="#f43f5e" fillOpacity={0.18} />
                </>
              ) : (
                <>
                  <ReferenceArea y1={th.chartMin} y2={th.greenMax} fill="#10b981" fillOpacity={0.14} />
                  <ReferenceArea y1={th.greenMax} y2={th.amberMax} fill="#f59e0b" fillOpacity={0.16} />
                  <ReferenceArea y1={th.amberMax} y2={th.chartMax} fill="#f43f5e" fillOpacity={0.18} />
                </>
              )}

              <Tooltip
                contentStyle={{
                  backgroundColor: '#070b25',
                  borderColor: '#38bdf8',
                  borderRadius: '0.75rem',
                }}
              />
              <Area
                type="monotone"
                dataKey="val"
                name={`${ind.name} (${ind.unit})`}
                stroke="#38bdf8"
                strokeWidth={3}
                fill="#38bdf8"
                fillOpacity={0.2}
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="bg-slate-900/90 border border-cyan-500/20 rounded-2xl p-5">
          <h3 className="text-sm font-mono uppercase text-cyan-300 font-bold mb-2">
            💡 Pourquoi c’est important
          </h3>
          <p className="text-sm text-slate-200 leading-relaxed">{ind.whyImportant}</p>
        </div>

        <div className="bg-slate-900/90 border border-cyan-500/20 rounded-2xl p-5">
          <h3 className="text-sm font-mono uppercase text-amber-300 font-bold mb-2">
            🚀 Effet de l’espace
          </h3>
          <p className="text-sm text-slate-200 leading-relaxed">{ind.spaceEffect}</p>
        </div>
      </div>
    </div>
  );
}