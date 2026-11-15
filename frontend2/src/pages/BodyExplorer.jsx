import { useState } from 'react';
import { BODY_SYSTEMS, INDICATORS_CATALOG } from '../data/serenisDb';
import { useMission } from '../context/MissionContext';
import StatusBadge, { getStatusMeta } from '../components/StatusBadge';
import BodySvg from '../components/BodySvg';

export default function BodyExplorer() {
  const { values, indicatorStatuses, setSelectedIndicatorId, setActiveTab } = useMission();
  const [selectedSysId, setSelectedSysId] = useState('heart');

  const getSystemStatus = (sys) => {
    const sts = sys.indicators.map((id) => indicatorStatuses[id]);
    if (sts.includes('RED')) return 'RED';
    if (sts.includes('AMBER')) return 'AMBER';
    return 'GREEN';
  };

  const activeSystem = BODY_SYSTEMS.find((s) => s.id === selectedSysId) || BODY_SYSTEMS[0];
  const systemStatuses = Object.fromEntries(BODY_SYSTEMS.map((s) => [s.id, getSystemStatus(s)]));

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
      <div className="lg:col-span-5 bg-slate-900/90 border border-cyan-500/20 rounded-2xl p-5 flex flex-col items-center">
        <h2 className="eyebrow mb-1">Scanner Biométrique Holographique</h2>
        <p className="text-xs text-slate-400 mb-3 text-center">
          Touchez un organe ou un système anatomique pour inspecter ses constantes
        </p>

        <BodySvg
          statuses={systemStatuses}
          selected={selectedSysId}
          onSelect={setSelectedSysId}
        />

        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 w-full mt-3">
          {BODY_SYSTEMS.map((sys) => {
            const st = getSystemStatus(sys);
            const meta = getStatusMeta(st);
            return (
              <button
                key={sys.id}
                onClick={() => setSelectedSysId(sys.id)}
                className={`py-2.5 px-3 rounded-xl text-xs font-bold border cursor-pointer transition ${
                  selectedSysId === sys.id
                    ? 'bg-cyan-500/25 border-cyan-400 text-white'
                    : 'bg-slate-950 border-slate-800 text-slate-300 hover:border-slate-600'
                }`}
              >
                {meta.icon} {sys.name.split(' ')[0]}
              </button>
            );
          })}
        </div>
      </div>

      <div className="lg:col-span-7 bg-slate-900/90 border border-cyan-500/20 rounded-2xl p-6 flex flex-col justify-between">
        <div>
          <div className="flex flex-wrap items-center justify-between gap-2 mb-3">
            <h3 className="text-2xl font-bold text-white">{activeSystem.name}</h3>
            <StatusBadge status={getSystemStatus(activeSystem)} />
          </div>

          <p className="text-sm text-slate-300 mb-6 leading-relaxed">
            {activeSystem.description}
          </p>

          <h4 className="text-xs font-mono uppercase text-cyan-300 mb-3">
            Indicateurs rattachés à ce système :
          </h4>

          <div className="space-y-3">
            {activeSystem.indicators.map((indId) => {
              const ind = INDICATORS_CATALOG[indId];
              const st = indicatorStatuses[indId];
              return (
                <div
                  key={indId}
                  className="bg-slate-950 border border-slate-800 rounded-xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3"
                >
                  <div>
                    <div className="font-bold text-white text-sm">{ind.name}</div>
                    <div className="text-lg font-mono text-cyan-300">
                      {values[indId]} {ind.unit}
                    </div>
                  </div>

                  <div className="flex flex-wrap items-center gap-2">
                    <StatusBadge status={st} />
                    <button
                      onClick={() => {
                        setSelectedIndicatorId(indId);
                        setActiveTab('detail');
                      }}
                      className="py-2.5 px-3.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-xs font-bold text-white cursor-pointer"
                    >
                      📈 Courbe
                    </button>
                    <button
                      onClick={() => {
                        setSelectedIndicatorId(indId);
                        setActiveTab('measure');
                      }}
                      className="py-2.5 px-3.5 rounded-xl bg-cyan-500/20 border border-cyan-400 text-xs font-bold text-cyan-200 cursor-pointer"
                    >
                      🩺 Mesurer
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}