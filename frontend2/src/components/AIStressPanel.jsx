import { useState } from 'react';
import { apiRequest } from '../api';

export default function AIStressPanel({ token }) {
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState('');

  async function runDemoAnalysis() {
    setLoading(true);
    setError('');
    setResult(null);

    const baseline_windows = Array.from({ length: 15 }, (_, i) => ({
      heart_rate_mean: 70 + i * 0.2,
      heart_rate_std: 2,
      hrv_rmssd: 45 + i * 0.3,
      hrv_sdnn: 50 + i * 0.2,
      eda_mean: 0.25,
      eda_std: 0.05,
      eda_min: 0.15,
      eda_max: 0.40,
      acc_magnitude_mean: 1.02,
      acc_magnitude_std: 0.08,
    }));

    const current_window = {
      heart_rate_mean: 88,
      heart_rate_std: 5,
      hrv_rmssd: 22,
      hrv_sdnn: 28,
      eda_mean: 0.55,
      eda_std: 0.12,
      eda_min: 0.20,
      eda_max: 0.85,
      acc_magnitude_mean: 1.15,
      acc_magnitude_std: 0.15,
    };

    try {
      const data = await apiRequest('/ai/stress/predict', {
        method: 'POST',
        token,
        body: JSON.stringify({ baseline_windows, current_window }),
      });

      setResult(data);
    } catch (err) {
      setError(err.message || 'AI analysis failed.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <section className="rounded-2xl border border-cyan-500/30 bg-slate-900/90 p-5 space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <div className="text-xs font-mono tracking-widest text-cyan-300">
            SENTRA / ARTIFICIAL INTELLIGENCE
          </div>
          <h2 className="mt-1 text-lg font-bold text-white">
            AI Stress Analysis
          </h2>
          <p className="mt-1 text-xs text-slate-400">
            Experimental WESAD Random Forest classifier
          </p>
        </div>

        <span className="rounded-full border border-amber-400/30 bg-amber-400/10 px-3 py-1 text-xs text-amber-300">
          DEMO DATA
        </span>
      </div>

      <div className="rounded-xl border border-amber-400/20 bg-amber-400/5 p-3">
        <p className="text-sm text-amber-200">
          This test uses synthetic measurements, not real astronaut sensor data.
          Its result is for technical demonstration only.
        </p>
      </div>

      <button
        onClick={runDemoAnalysis}
        disabled={loading || !token}
        className="w-full rounded-xl bg-cyan-500 px-4 py-3 text-sm font-bold text-slate-950 transition hover:bg-cyan-400 disabled:cursor-not-allowed disabled:opacity-50"
      >
        {loading ? 'Running Random Forest...' : 'Run AI Demo Analysis'}
      </button>

      {error && (
        <div className="rounded-xl border border-rose-500/30 bg-rose-500/10 p-3 text-sm text-rose-300">
          {error}
        </div>
      )}

      {result && (
        <div className="rounded-xl border border-cyan-500/20 bg-slate-950 p-4 space-y-3">
          <div className="text-xs font-mono text-slate-400">
            MODEL PREDICTION
          </div>

          <div className="flex items-center justify-between gap-3">
            <span className="text-2xl font-bold text-white">
              {String(result.prediction).toUpperCase()}
            </span>
            <span className="text-sm font-mono text-cyan-300">
              {(result.stress_probability * 100).toFixed(2)}% stress
            </span>
          </div>

          <div className="h-2 overflow-hidden rounded-full bg-slate-700">
            <div
              className="h-full rounded-full bg-cyan-400"
              style={{
                width: `${Math.max(0, Math.min(100, result.stress_probability * 100))}%`,
              }}
            />
          </div>

          <div className="grid grid-cols-2 gap-3 text-sm">
            <div className="rounded-lg bg-white/5 p-3">
              <div className="text-xs text-slate-400">Stress probability</div>
              <div className="mt-1 font-mono text-white">
                {(result.stress_probability * 100).toFixed(2)}%
              </div>
            </div>
            <div className="rounded-lg bg-white/5 p-3">
              <div className="text-xs text-slate-400">Baseline probability</div>
              <div className="mt-1 font-mono text-white">
                {(result.baseline_probability * 100).toFixed(2)}%
              </div>
            </div>
          </div>

          <div className="text-xs text-slate-400">
            {result.model} · {result.dataset} · {result.calibration_windows} baseline windows
          </div>

          <p className="text-xs text-amber-300">
            {result.disclaimer}
          </p>
        </div>
      )}
    </section>
  );
}
