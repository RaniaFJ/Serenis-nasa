import { useI18n } from '../i18n'
import { STATUS_ICON, STATUS_STYLE } from '../content/format'

// Étiquette d'état : couleur + icône + texte (jamais la couleur seule).
export default function StatusBadge({ status }) {
  const { t } = useI18n()
  return (
    <span
      className={`inline-flex items-center gap-1.5 whitespace-nowrap rounded-full px-2 py-0.5 text-xs font-medium ring-1 ring-inset ${STATUS_STYLE[status].badge}`}
    >
      <span aria-hidden="true" className="text-[0.65rem]">{STATUS_ICON[status]}</span>
      {t(`status.${status}`)}
    </span>
  )
}
