import { useMission } from '../context/MissionContext';
import StatusBadge from '../components/StatusBadge';

export default function AlertsAndComms() {
  const {
    alerts,
    env,
    commCountdown,
    setCommCountdown,
    surgeonCalled,
    triggerSurgeonContact,
  } = useMission();

  const minutes = String(Math.floor(commCountdown / 60)).padStart(2, '0');
  const seconds = String(commCountdown % 60).padStart(2, '0');

  return (
    <div className="space-y-6">
      <div className="bg-slate-900/90 border border-amber-500/40 rounded-2xl p-5 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="text-xs font-mono uppercase text-amber-300 font-bold">
            📡 Simulateur de Délai de Communication ({env.name})
          </div>
          <p className="text-sm text-slate-300 mt-1">
            {env.commDelaySec >= 720
              ? 'En mode Mars, un message met 12 minutes pour atteindre Houston : l’astronaute doit appliquer le protocole autonome immédiatement.'
              : 'En orbite basse / Lune, la liaison avec le médecin de vol est quasi instantanée.'}
          </p>
        </div>

        <div className="flex items-center gap-3 shrink-0">
          {surgeonCalled && (
            <div className="bg-slate-950 border border-amber-400 rounded-xl px-4 py-2.5 text-center">
              <div className="text-[10px] font-mono text-slate-400">RÉPONSE TERRE DANS</div>
              <div className="text-xl font-bold font-mono text-amber-300">
                {commCountdown > 0 ? `${minutes}:${seconds}` : '✓ REÇUE'}
              </div>
            </div>
          )}

          {commCountdown > 60 && (
            <button
              onClick={() => setCommCountdown(15)}
              className="py-3 px-3 rounded-xl bg-slate-800 border border-slate-700 text-xs font-mono text-slate-300 cursor-pointer"
            >
              ⏩ Accélérer démo (15s)
            </button>
          )}
        </div>
      </div>

      {alerts.length === 0 ? (
        <div className="bg-slate-900/90 border border-emerald-500/30 rounded-2xl p-8 text-center space-y-2">
          <div className="text-3xl">✓</div>
          <h3 className="text-lg font-bold text-emerald-300">Aucune alerte médicale en cours</h3>
          <p className="text-sm text-slate-400">
            Cliquez sur « ✖ Crise » dans la barre supérieure pour tester le déclenchement d’urgence.
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {alerts.map((al) => (
            <div
              key={al.id}
              className={`bg-slate-900/95 border-2 rounded-2xl p-6 space-y-4 ${
                al.severity === 'RED' ? 'border-rose-500' : 'border-amber-400'
              }`}
            >
              <div className="flex flex-wrap items-center justify-between gap-2">
                <h3 className="text-lg font-bold text-white">{al.title}</h3>
                <StatusBadge status={al.severity} />
              </div>

              <div className="bg-slate-950 border border-cyan-500/40 rounded-xl p-4">
                <div className="text-xs font-mono uppercase text-cyan-300 mb-1">
                  ⚡ Action Recommandée Immédiate :
                </div>
                <div className="text-base md:text-lg font-extrabold text-white">{al.action}</div>
              </div>

              {al.contactSurgeon && (
                <div className="flex flex-wrap items-center justify-between gap-3 pt-2">
                  <button
                    onClick={triggerSurgeonContact}
                    className="py-4 px-6 rounded-xl bg-rose-600 hover:bg-rose-500 text-white font-extrabold text-sm md:text-base cursor-pointer shadow-lg"
                  >
                    📞 Contacter le médecin de vol (Houston)
                  </button>
                  {surgeonCalled && (
                    <span className="text-xs font-mono text-amber-300">
                      Transmission envoyée ! Agissez en autonomie pendant le compte à rebours ({minutes}:{seconds}).
                    </span>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}