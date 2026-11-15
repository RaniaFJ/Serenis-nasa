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

  return (
    <div className="space-y-6">
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