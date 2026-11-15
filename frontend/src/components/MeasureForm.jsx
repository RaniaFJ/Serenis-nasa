import { useState } from 'react'
import { api } from '../api'
import { useI18n } from '../i18n'
import AdvicePanel from './AdvicePanel'
import StatusBadge from './StatusBadge'
import { STATUS_STYLE, todayISO } from '../content/format'

// Saisie d'une mesure → POST /measures. Le backend valide, signe, chaîne et chiffre avant d'écrire en base.
export default function MeasureForm({ indicators, onSaved }) {
  const { t } = useI18n()
  const [indicator, setIndicator] = useState(indicators[0].indicator)
  const [value, setValue] = useState('')
  const [value2, setValue2] = useState('')
  const [date, setDate] = useState(todayISO())
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState(null)
  const [saved, setSaved] = useState(null)

  const item = indicators.find((i) => i.indicator === indicator)
  const isBP = indicator === 'blood_pressure'
  const step = item.decimals ? 0.1 : 1

  async function submit(e) {
    e.preventDefault()
    setError(null)
    setSaved(null)
    if (value === '' || (isBP && value2 === '')) {
      setError(t('form.invalid'))
      return
    }
    setBusy(true)
    try {
      const m = await api.addMeasure({
        date,
        indicator,
        value: Number(value),
        value2: isBP ? Number(value2) : null,
        unit: item.unit,
      })
      setSaved(m)
      setValue('')
      setValue2('')
      onSaved()
    } catch (err) {
      setError(err.message || t('error.generic'))
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="grid items-start gap-6 lg:grid-cols-[minmax(18rem,26rem)_minmax(0,1fr)]">
      <form className="panel space-y-4" onSubmit={submit}>
        <h3 className="text-base">{t('form.title')}</h3>

        <label className="label">
          {t('form.indicator')}
          <select
            className="field"
            value={indicator}
            onChange={(e) => {
              setIndicator(e.target.value)
              setSaved(null)
              setError(null)
            }}
          >
            {indicators.map((i) => (
              <option key={i.indicator} value={i.indicator}>
                {i.label}
              </option>
            ))}
          </select>
        </label>

        {isBP ? (
          <div className="grid grid-cols-2 gap-3">
            <label className="label">
              {t('form.systolic')} (mmHg)
              <input className="field tnum" type="number" inputMode="decimal" step="1" value={value} onChange={(e) => setValue(e.target.value)} required />
            </label>
            <label className="label">
              {t('form.diastolic')} (mmHg)
              <input className="field tnum" type="number" inputMode="decimal" step="1" value={value2} onChange={(e) => setValue2(e.target.value)} required />
            </label>
          </div>
        ) : (
          <label className="label">
            {t('form.value')} ({item.unit})
            <input className="field tnum" type="number" inputMode="decimal" step={step} value={value} onChange={(e) => setValue(e.target.value)} required />
          </label>
        )}

        <label className="label">
          {t('form.date')}
          <input className="field" type="date" value={date} max={todayISO()} onChange={(e) => setDate(e.target.value)} required />
        </label>

        <button type="submit" className="btn btn-primary w-full" disabled={busy}>
          {busy ? t('loading') : t('form.submit')}
        </button>

        {error && <p className="text-sm text-bad" role="alert">{error}</p>}
        {saved && (
          <div className={`rounded-control border p-3 text-sm ${STATUS_STYLE[saved.status].callout}`} role="status">
            <div className="flex items-center gap-2 font-medium">
              {t('form.result')} <StatusBadge status={saved.status} />
            </div>
            <p className="mt-1">{saved.hash ? t('form.saved') : t('form.savedPlain')}</p>
            <p className="mt-1 font-mono text-xs text-mute">#{saved.id}{saved.hash ? ` ${saved.hash.slice(0, 16)}…` : ''}</p>
          </div>
        )}
      </form>

      <div className="panel">
        <h3 className="mb-3 text-base">{item.label}</h3>
        <AdvicePanel indicator={indicator} status={null} showActionsFor={saved?.indicator === indicator ? saved.status : null} />
      </div>
    </div>
  )
}
