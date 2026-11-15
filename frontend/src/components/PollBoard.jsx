import { useI18n } from '../i18n'
import { STATUS_COLOR, STATUS_ICON } from '../content/format'

// Élément signature : le « poll » GO / NO-GO du contrôle de mission.
// Le verdict global est annoncé en grand ; chaque indicateur est un voyant que l'on peut sélectionner.
const VERDICT = { fit: 'GO', watch: 'GO', unfit: 'NO-GO' }
const TONE = { fit: 'text-ok', watch: 'text-warn', unfit: 'text-bad' }

export default function PollBoard({ indicators, fitness, selected, onSelect }) {
  const { t } = useI18n()
  const inRange = indicators.filter((i) => i.status === 'normal').length
  return (
    <div role="group" aria-label={t('ring.title')}>
      <div className="flex items-end justify-between gap-3 border-b border-edge-strong pb-3">
        <p
          className={`whitespace-nowrap font-display text-6xl font-bold leading-[0.85] tracking-tight sm:text-7xl ${TONE[fitness]}`}
          aria-label={t(`fit.${fitness}`)}
        >
          {VERDICT[fitness]}
        </p>
        <p className="pb-0.5 text-right text-sm leading-tight text-mute">
          <span className={`block font-semibold ${TONE[fitness]}`}>{t(`fit.${fitness}`)}</span>
          <span className="tnum">
            {inRange}/{indicators.length} {t('ring.inRange')}
          </span>
        </p>
      </div>
      <ul className="mt-1 divide-y divide-edge">
        {indicators.map((it) => {
          const active = it.indicator === selected
          return (
            <li key={it.indicator}>
              <button
                type="button"
                aria-pressed={active}
                onClick={() => onSelect(it.indicator)}
                className={`flex w-full cursor-pointer items-center gap-3 py-1.5 pl-2 pr-1 text-left text-sm transition-colors ${
                  active ? 'bg-raised font-semibold' : 'hover:bg-raised/60'
                }`}
              >
                <span
                  aria-hidden="true"
                  className="grid size-4 shrink-0 place-items-center rounded-[2px] text-[0.6rem] leading-none text-white"
                  style={{ background: STATUS_COLOR[it.status] }}
                >
                  {STATUS_ICON[it.status]}
                </span>
                <span className="min-w-0 flex-1 truncate">{it.label}</span>
                <span className="sr-only">{t(`status.${it.status}`)}</span>
              </button>
            </li>
          )
        })}
      </ul>
    </div>
  )
}
