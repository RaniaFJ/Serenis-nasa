import { useState, useEffect } from 'react';
import { INDICATORS_CATALOG } from '../data/serenisDb';
import { useMission } from '../context/MissionContext';
import StatusBadge from '../components/StatusBadge';

export default function GuidedMeasure() {
  const {
    values,
    env,
    selectedIndicatorId,
    setSelectedIndicatorId,
    recordMeasurement,
    offlineMode,
  } = useMission();

  const indicator = INDICATORS_CATALOG[selectedIndicatorId] || INDICATORS_CATALOG.hr;
  const [rawInput, setRawInput] = useState(String(values[indicator.id]));
  const [errorMsg, setErrorMsg] = useState('');
  const [feedback, setFeedback] = useState(null);

  useEffect(() => {
    setRawInput(String(values[indicator.id]));
    setErrorMsg('');
    setFeedback(null);
  }, [indicator.id, values]);

  const handleSubmit = (e) => {
    e.preventDefault();
    const num = parseFloat(rawInput);

    if (Number.isNaN(num) || num < indicator.minValid || num > indicator.maxValid) {
      setFeedback(null);
      setErrorMsg(
        `✖ Valeur absurde refusée : veuillez saisir un nombre réaliste entre ${indicator.minValid} et ${indicator.maxValid} ${indicator.unit}.`
      );
      return;
    }

    setErrorMsg('');
    recordMeasurement(indicator.id, num);
    const status = indicator.evaluate(num, env);
    setFeedback({
      status,
      value: num,
      message:
        status === 'GREEN'
          ? 'Mesure enregistrée dans la zone nominale. Continuez votre protocole habituel.'
          : status === 'AMBER'
          ? 'Attention : valeur en zone de vigilance. Appliquez la contre-mesure préventive recommandée.'
          : 'Alerte critique détectée ! Consultez immédiatement l’onglet Alertes & Mars.',
    });
  };

  return (
    <div className="max-w-3xl mx-auto bg-slate-900/90 border border-cyan-500/20 rounded-2xl p-6 space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-white">Saisie Guidée d’une Mesure</h2>
        <p className="text-xs text-slate-400">
          Suivez les étapes de protocole avant de valider. Les valeurs aberrantes sont automatiquement bloquées.
        </p>
      </div>

      <div>
        <label className="block text-xs font-mono text-cyan-300 uppercase mb-2">
          1. Choisir l’indicateur à mesurer :
        </label>
        <select
          value={indicator.id}
          onChange={(e) => setSelectedIndicatorId(e.target.value)}
          className="w-full bg-slate-950 border-2 border-slate-700 focus:border-cyan-400 rounded-xl p-3.5 text-base font-bold text-white outline-none"
        >
          {Object.values(INDICATORS_CATALOG).map((ind) => (
            <option key={ind.id} value={ind.id}>
              {ind.name} ({ind.unit})
            </option>
          ))}
        </select>
      </div>

      <div className="bg-slate-950 border border-cyan-500/30 rounded-xl p-4">
        <div className="text-xs font-mono uppercase text-cyan-300 font-bold mb-2">
          📋 Comment mesurer ({indicator.name}) :
        </div>
        <ol className="list-decimal pl-5 space-y-1.5 text-sm text-slate-200">
          {indicator.howToMeasure.map((step, idx) => (
            <li key={idx}>{step}</li>
          ))}
        </ol>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-xs font-mono text-cyan-300 uppercase mb-2">
            2. Saisir la valeur ({indicator.unit}) :
          </label>

          {indicator.inputType === 'slider' ? (
            <div className="bg-slate-950 border border-slate-700 rounded-xl p-5 space-y-3">
              <div className="flex justify-between items-center">
                <span className="text-sm text-slate-400">1 (Faible)</span>
                <span className="text-3xl font-bold font-mono text-cyan-300">
                  {rawInput} {indicator.unit}
                </span>
                <span className="text-sm text-slate-400">10 (Maximum)</span>
              </div>
              <input
                type="range"
                min={indicator.minValid}
                max={indicator.maxValid}
                step={indicator.step}
                value={rawInput}
                onChange={(e) => setRawInput(e.target.value)}
                className="w-full h-4 accent-cyan-400 cursor-pointer"
              />
            </div>
          ) : (
            <input
              type="number"
              step={indicator.step}
              value={rawInput}
              onChange={(e) => setRawInput(e.target.value)}
              className="w-full bg-slate-950 border-2 border-slate-700 focus:border-cyan-400 rounded-xl p-4 text-2xl font-bold font-mono text-white outline-none"
            />
          )}
        </div>

        {errorMsg && (
          <div className="p-4 rounded-xl bg-rose-950/70 border border-rose-500 text-rose-200 text-sm font-bold">
            {errorMsg}
          </div>
        )}

        <button
          type="submit"
          className="w-full py-4 px-6 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-extrabold text-base tracking-wide cursor-pointer transition"
        >
          ✓ ENREGISTRER LA MESURE {offlineMode ? '(SAUVEGARDE HORS-LIGNE)' : ''}
        </button>
      </form>

      {feedback && (
        <div
          className={`p-5 rounded-2xl border-2 space-y-2 ${
            feedback.status === 'GREEN'
              ? 'bg-emerald-950/50 border-emerald-500'
              : feedback.status === 'AMBER'
              ? 'bg-amber-950/50 border-amber-500'
              : 'bg-rose-950/50 border-rose-500'
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-lg font-bold text-white">
              Résultat enregistré : {feedback.value} {indicator.unit}
            </span>
            <StatusBadge status={feedback.status} />
          </div>
          <p className="text-sm text-slate-200">{feedback.message}</p>
        </div>
      )}
    </div>
  );
}