import { useEffect, useState } from 'react'
import { api } from '../api'
import { useI18n } from '../i18n'
import StatusBadge from './StatusBadge'
import { STATUS_STYLE } from '../content/format'

// Explications pédagogiques pour un indicateur (comment mesurer, pourquoi, que faire).
// Les textes viennent de l'API : GET /advice/{indicator}?lang=fr
export default function AdvicePanel({ indicator, status, showActionsFor }) {
  const { t, lang } = useI18n()
  const [advice, setAdvice] = useState(null)
  const [error, setError] = useState(null)

  useEffect(() => {
    let cancelled = false
    setAdvice(null)
    setError(null)
    api
      .getAdvice(indicator, lang)
      .then((a) => !cancelled && setAdvice(a))
      .catch((e) => !cancelled && setError(e.message))
    return () => {
      cancelled = true
    }
  }, [indicator, lang])

  if (error) return <p className="text-bad">{error}</p>
  if (!advice) return <p className="text-mute">{t('loading')}</p>

  const current = showActionsFor || status
  return (
    <div className="space-y-4 text-sm leading-relaxed">
      <div>
        <h4 className="section-title mb-1">{t('advice.how')}</h4>
        <p>{advice.how_to_measure}</p>
      </div>
      <div>
        <h4 className="section-title mb-1">{t('advice.why')}</h4>
        <p>{advice.why}</p>
        <p className="mt-1 text-xs text-mute">
          {t('advice.hazard')} : <strong className="font-medium text-fg">{advice.hazard}</strong>
        </p>
      </div>
      {current && current !== 'nodata' && (
        <div className={`rounded-control border p-3 ${STATUS_STYLE[current].callout}`}>
          <div className="mb-1 flex items-center gap-2 font-medium">
            {t('advice.actions')} <StatusBadge status={current} />
          </div>
          <p>{advice.actions[current]}</p>
        </div>
      )}
      <p className="text-xs text-mute">
        {t('advice.ranges')} : {advice.ranges.normal[0]} à {advice.ranges.normal[1]} {advice.unit} ({t('status.normal')}),{' '}
        {advice.ranges.watch[0]} à {advice.ranges.watch[1]} ({t('status.watch')}). {t('advice.refNote')}
      </p>
    </div>
  )
}
