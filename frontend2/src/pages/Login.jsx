import { useState } from 'react';
import { apiRequest } from '../api';

export default function Login({ onLogin }) {
  const [astronautId, setAstronautId] = useState('');
  const [passcode, setPasscode] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  async function handleSubmit(event) {
    event.preventDefault();
    setError('');
    setLoading(true);

    try {
      const result = await apiRequest('/auth/login', {
        method: 'POST',
        body: JSON.stringify({
          astronaut_id: Number(astronautId),
          passcode,
        }),
      });

      if (!result.access_token) {
        throw new Error('The API did not return an access token.');
      }

      onLogin(result.access_token, result.astronaut);
    } catch (err) {
      setError(err.message || 'Unable to sign in.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="relative grid min-h-screen place-items-center overflow-hidden bg-[#050816] px-4 py-10 text-slate-100">
      <div className="pointer-events-none absolute left-1/2 top-1/2 h-[600px] w-[600px] -translate-x-1/2 -translate-y-1/2 rounded-full bg-cyan-500/10 blur-[120px]" />

      <div className="relative w-full max-w-md rounded-3xl border border-cyan-400/20 bg-slate-900/70 p-8 shadow-2xl backdrop-blur-xl">
        <div className="mb-8 text-center">
          <div className="mx-auto mb-4 grid h-16 w-16 place-items-center rounded-full border border-cyan-300/30 bg-cyan-400/10 text-3xl text-cyan-200">
            ◉
          </div>
          <p className="eyebrow mb-3">Mission Control · Secure Access</p>
          <h1 className="text-4xl text-white">SENTRA</h1>
          <p className="mt-3 text-sm text-slate-400">
            Astronaut health monitoring system
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-5">
          <div>
            <label htmlFor="astronaut-id" className="mb-2 block font-mono text-xs uppercase tracking-wider text-cyan-200">
              Astronaut ID
            </label>
            <input
              id="astronaut-id"
              type="number"
              min="1"
              required
              value={astronautId}
              onChange={(event) => setAstronautId(event.target.value)}
              placeholder="Enter your astronaut ID"
              className="w-full rounded-xl border border-white/10 bg-slate-950/80 px-4 py-3 text-white outline-none transition focus:border-cyan-400"
            />
          </div>

          <div>
            <label htmlFor="passcode" className="mb-2 block font-mono text-xs uppercase tracking-wider text-cyan-200">
              Passcode
            </label>
            <input
              id="passcode"
              type="password"
              required
              value={passcode}
              onChange={(event) => setPasscode(event.target.value)}
              placeholder="Enter your passcode"
              className="w-full rounded-xl border border-white/10 bg-slate-950/80 px-4 py-3 text-white outline-none transition focus:border-cyan-400"
            />
          </div>

          {error && (
            <p role="alert" className="rounded-xl border border-rose-400/30 bg-rose-500/10 p-3 text-sm text-rose-300">
              {error}
            </p>
          )}

          <button
            type="submit"
            disabled={loading || !astronautId || !passcode}
            className="w-full rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 px-4 py-3 font-semibold text-white transition hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {loading ? 'Authenticating...' : 'Access Mission Control'}
          </button>
        </form>

        <p className="mt-6 text-center font-mono text-[10px] uppercase tracking-wider text-slate-500">
          Authorized personnel only
        </p>
      </div>
    </div>
  );
}
