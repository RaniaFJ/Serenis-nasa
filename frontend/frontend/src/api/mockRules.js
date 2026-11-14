// Règles de santé de la FAUSSE API (mode mock).
// ⚠️ La source de vérité réelle est backend/rules.py : les seuils doivent y être identiques.
// Les valeurs sont des repères médicaux classiques et indicatifs, à faire valider/adapter par un médecin de vol.
// Sources NASA du défi : https://www.nasa.gov/hrp/hazards/ et https://www.nasa.gov/hrp/risks/

export const INDICATOR_KEYS = [
  'heart_rate',
  'blood_pressure',
  'glucose',
  'temperature',
  'sleep',
  'mood',
  'exercise',
]

export const INDICATORS = {
  heart_rate: {
    unit: 'bpm', decimals: 0, normal: [60, 100], watch: [50, 110],
    label: { fr: 'Fréquence cardiaque', en: 'Heart rate' },
  },
  blood_pressure: {
    // value = systolique, value2 = diastolique ; seuils de graphique = systolique
    unit: 'mmHg', decimals: 0, normal: [90, 119], watch: [90, 139],
    label: { fr: 'Tension artérielle', en: 'Blood pressure' },
  },
  glucose: {
    unit: 'mg/dL', decimals: 0, normal: [70, 99], watch: [70, 125],
    label: { fr: 'Glycémie (à jeun)', en: 'Blood glucose (fasting)' },
  },
  temperature: {
    unit: '°C', decimals: 1, normal: [36.1, 37.2], watch: [35.5, 37.9],
    label: { fr: 'Température', en: 'Body temperature' },
  },
  sleep: {
    unit: 'h', decimals: 1, normal: [7, 9], watch: [5, 10],
    label: { fr: 'Sommeil', en: 'Sleep' },
  },
  mood: {
    unit: '/5', decimals: 0, normal: [4, 5], watch: [3, 5],
    label: { fr: 'Humeur', en: 'Mood' },
  },
  exercise: {
    unit: 'min', decimals: 0, normal: [60, 400], watch: [30, 400],
    label: { fr: 'Exercice', en: 'Exercise' },
  },
}

// Plages de saisie acceptées (anti-erreur de frappe) — le backend doit aussi les valider (Pydantic).
export const INPUT_LIMITS = {
  heart_rate: [20, 250],
  blood_pressure: [50, 260],
  glucose: [20, 600],
  temperature: [30, 45],
  sleep: [0, 24],
  mood: [1, 5],
  exercise: [0, 600],
}

export const ADVICE = {
  heart_rate: {
    how: {
      fr: 'Au repos, assis depuis 5 minutes : posez deux doigts sur le poignet (ou utilisez le capteur) et comptez 30 s, puis multipliez par 2.',
      en: 'At rest, seated for 5 minutes: place two fingers on your wrist (or use the sensor), count for 30 s and double it.',
    },
    why: {
      fr: 'En apesanteur, le cœur et les vaisseaux s’adaptent ; une fréquence anormale peut signaler un stress cardiovasculaire, une déshydratation ou une infection.',
      en: 'In weightlessness the heart and vessels adapt; an abnormal rate can signal cardiovascular strain, dehydration or infection.',
    },
    hazard: { fr: 'Gravité (adaptation cardiovasculaire)', en: 'Gravity fields (cardiovascular adaptation)' },
    actions: {
      normal: { fr: 'Continuez votre routine d’exercice.', en: 'Keep up your exercise routine.' },
      watch: { fr: 'Reposez-vous 10 minutes, hydratez-vous et refaites la mesure.', en: 'Rest for 10 minutes, hydrate and measure again.' },
      alert: { fr: 'Arrêtez l’effort, refaites la mesure et contactez le médecin de vol.', en: 'Stop exertion, measure again and contact the flight surgeon.' },
    },
  },
  blood_pressure: {
    how: {
      fr: 'Brassard gonflable au bras, assis et immobile depuis 5 minutes. Notez la systolique (haut) et la diastolique (bas).',
      en: 'Inflatable cuff on the upper arm, seated and still for 5 minutes. Record systolic (top) and diastolic (bottom).',
    },
    why: {
      fr: 'La redistribution des fluides en microgravité modifie la circulation ; la tension aide à repérer le risque d’événement cardiovasculaire.',
      en: 'Fluid shifts in microgravity alter circulation; blood pressure helps spot cardiovascular event risk.',
    },
    hazard: { fr: 'Gravité (adaptation cardiovasculaire)', en: 'Gravity fields (cardiovascular adaptation)' },
    actions: {
      normal: { fr: 'Aucune action : gardez vos habitudes.', en: 'No action needed: keep your habits.' },
      watch: { fr: 'Réduisez le sel, hydratez-vous, mesurez à nouveau dans 1 heure.', en: 'Reduce salt, hydrate, measure again in 1 hour.' },
      alert: { fr: 'Repos immédiat et contact avec le médecin de vol.', en: 'Rest immediately and contact the flight surgeon.' },
    },
  },
  glucose: {
    how: {
      fr: 'À jeun depuis au moins 8 heures : piquez le bout du doigt avec le lecteur de glycémie et lisez la valeur en mg/dL.',
      en: 'After fasting for at least 8 hours: prick a fingertip with the glucose meter and read the value in mg/dL.',
    },
    why: {
      fr: 'Une alimentation inadéquate ou le stress modifient le métabolisme ; la glycémie reflète l’équilibre nutritionnel.',
      en: 'Inadequate nutrition or stress changes metabolism; glucose reflects nutritional balance.',
    },
    hazard: { fr: 'Alimentation et nutrition inadéquates', en: 'Inadequate food and nutrition' },
    actions: {
      normal: { fr: 'Poursuivez une alimentation équilibrée.', en: 'Continue a balanced diet.' },
      watch: { fr: 'Ajustez le prochain repas (moins de sucres rapides) et remesurez.', en: 'Adjust the next meal (fewer fast sugars) and measure again.' },
      alert: { fr: 'Remesurez, suivez le protocole médical et contactez le médecin de vol.', en: 'Measure again, follow the medical protocol and contact the flight surgeon.' },
    },
  },
  temperature: {
    how: {
      fr: 'Thermomètre auriculaire ou frontal, au repos, loin d’une source de chaleur ou d’un effort récent.',
      en: 'Ear or forehead thermometer, at rest, away from heat sources or recent exertion.',
    },
    why: {
      fr: 'Le stress du vol peut réveiller des virus dormants et modifier l’immunité ; une fièvre est un signal précoce.',
      en: 'Spaceflight stress can reactivate dormant viruses and alter immunity; a fever is an early signal.',
    },
    hazard: { fr: 'Milieu fermé et hostile (immunité)', en: 'Hostile/closed environments (immune system)' },
    actions: {
      normal: { fr: 'Rien à signaler.', en: 'Nothing to report.' },
      watch: { fr: 'Surveillez d’autres signes (éruption, fatigue) et remesurez dans 4 heures.', en: 'Watch for other signs (rash, fatigue) and measure again in 4 hours.' },
      alert: { fr: 'Isolez-vous si possible, notez les symptômes et contactez le médecin de vol.', en: 'Isolate if possible, note symptoms and contact the flight surgeon.' },
    },
  },
  sleep: {
    how: {
      fr: 'Notez le nombre d’heures dormies la nuit passée (ou lisez-le sur le bracelet d’actigraphie).',
      en: 'Record the hours slept last night (or read them from the actigraphy wristband).',
    },
    why: {
      fr: 'Le travail intense et les horloges biologiques perturbées provoquent un manque de sommeil chronique, qui dégrade la performance et la santé mentale.',
      en: 'Heavy workloads and disrupted body clocks cause chronic sleep loss, hurting performance and mental health.',
    },
    hazard: { fr: 'Sommeil inadéquat et horaires irréguliers', en: 'Inadequate sleep and irregular schedules' },
    actions: {
      normal: { fr: 'Gardez des horaires de coucher réguliers.', en: 'Keep regular bedtimes.' },
      watch: { fr: 'Réduisez la lumière vive le soir et fixez une heure de coucher.', en: 'Dim bright lights in the evening and fix a bedtime.' },
      alert: { fr: 'Demandez un allègement de la charge de travail et prévenez le commandant ou le médecin de vol.', en: 'Ask for a lighter workload and inform the commander or flight surgeon.' },
    },
  },
  mood: {
    how: {
      fr: 'Auto-évaluez votre humeur de 1 (très bas) à 5 (très bon), en pensant à la journée écoulée.',
      en: 'Rate your mood from 1 (very low) to 5 (very good), thinking about the past day.',
    },
    why: {
      fr: 'L’isolement, le confinement et la distance de la Terre pèsent sur la santé mentale ; l’humeur est un signal précoce.',
      en: 'Isolation, confinement and distance from Earth weigh on mental health; mood is an early signal.',
    },
    hazard: { fr: 'Isolement et confinement (santé comportementale)', en: 'Isolation and confinement (behavioral health)' },
    actions: {
      normal: { fr: 'Gardez des moments de partage avec l’équipage.', en: 'Keep sharing time with the crew.' },
      watch: { fr: 'Parlez à un coéquipier, prenez un moment pour une activité plaisante (ex. jardinage spatial, musique).', en: 'Talk to a crewmate and take time for something enjoyable (e.g. space gardening, music).' },
      alert: { fr: 'Contactez le soutien psychologique ou le médecin de vol.', en: 'Contact psychological support or the flight surgeon.' },
    },
  },
  exercise: {
    how: {
      fr: 'Additionnez les minutes d’exercice du jour (tapis roulant, vélo, résistance).',
      en: 'Add up today’s exercise minutes (treadmill, cycling, resistance).',
    },
    why: {
      fr: 'L’exercice quotidien compense la perte de densité osseuse, de force musculaire et de performance cardiovasculaire.',
      en: 'Daily exercise offsets losses in bone density, muscle strength and cardiovascular performance.',
    },
    hazard: { fr: 'Gravité (os, muscles, forme physique)', en: 'Gravity fields (bone, muscle, fitness)' },
    actions: {
      normal: { fr: 'Objectif atteint : continuez.', en: 'Goal reached: keep going.' },
      watch: { fr: 'Ajoutez une séance courte de résistance dans la journée.', en: 'Add a short resistance session today.' },
      alert: { fr: 'Faites une séance complète dès que possible ; la perte osseuse s’accumule vite.', en: 'Do a full session as soon as possible; bone loss builds quickly.' },
    },
  },
}

export function evaluate(key, value, value2) {
  const def = INDICATORS[key]
  if (!def || value == null) return 'nodata'
  if (key === 'blood_pressure') {
    const sys = value
    const dia = value2
    if (sys >= 140 || dia >= 90 || sys < 90 || dia < 55) return 'alert'
    if (sys < 120 && dia < 80) return 'normal'
    return 'watch'
  }
  const [nMin, nMax] = def.normal
  const [wMin, wMax] = def.watch
  if (value >= nMin && value <= nMax) return 'normal'
  if (value >= wMin && value <= wMax) return 'watch'
  return 'alert'
}

const avg = (arr) => arr.reduce((a, b) => a + b, 0) / arr.length

function lastDaysAverage(measures, key, days = 3) {
  const list = measures.filter((m) => m.indicator === key)
  const dates = [...new Set(list.map((m) => m.date))].sort().slice(-days)
  if (dates.length < days) return null
  const vals = dates.map((d) => {
    const dayVals = list.filter((m) => m.date === d)
    return dayVals[dayVals.length - 1].value
  })
  return avg(vals)
}

function trendOf(list) {
  if (list.length < 3) return 'flat'
  const latest = list[list.length - 1].value
  const prev = avg(list.slice(-4, -1).map((m) => m.value))
  if (!prev) return 'flat'
  const delta = (latest - prev) / prev
  if (delta > 0.03) return 'up'
  if (delta < -0.03) return 'down'
  return 'flat'
}

export function computeStatus(measures, lang = 'fr') {
  const indicators = INDICATOR_KEYS.map((key) => {
    const def = INDICATORS[key]
    const list = measures.filter((m) => m.indicator === key)
    const latest = list[list.length - 1] || null
    return {
      indicator: key,
      label: def.label[lang],
      unit: def.unit,
      decimals: def.decimals,
      latest: latest
        ? { id: latest.id, date: latest.date, value: latest.value, value2: latest.value2 ?? null }
        : null,
      status: latest ? evaluate(key, latest.value, latest.value2) : 'nodata',
      trend: trendOf(list),
      thresholds: { normal: def.normal, watch: def.watch },
    }
  })

  const alerts = []
  for (const it of indicators) {
    if (it.status === 'alert' || it.status === 'watch') {
      alerts.push({
        id: `ind-${it.indicator}`,
        level: it.status,
        title: it.label,
        detail: ADVICE[it.indicator].actions[it.status][lang],
        indicators: [it.indicator],
      })
    }
  }

  // Règles de tendance : combinaison de plusieurs signaux sur 3 jours
  const sleep3 = lastDaysAverage(measures, 'sleep')
  const mood3 = lastDaysAverage(measures, 'mood')
  if (sleep3 != null && mood3 != null && sleep3 < 7 && mood3 <= 3.5) {
    alerts.unshift({
      id: 'trend-behavioral',
      level: 'alert',
      title: lang === 'fr' ? 'Risque comportemental (tendance sur 3 jours)' : 'Behavioral risk (3-day trend)',
      detail:
        lang === 'fr'
          ? 'Sommeil insuffisant et humeur en baisse depuis 3 jours : parlez à l’équipage, réduisez la charge de travail et prévenez le médecin de vol.'
          : 'Insufficient sleep and falling mood for 3 days: talk to the crew, reduce workload and inform the flight surgeon.',
      indicators: ['sleep', 'mood'],
    })
  }
  const hr3 = lastDaysAverage(measures, 'heart_rate')
  const bp3 = lastDaysAverage(measures, 'blood_pressure')
  if ((hr3 != null && hr3 > 90) || (bp3 != null && bp3 >= 130)) {
    alerts.push({
      id: 'trend-cardio',
      level: 'watch',
      title: lang === 'fr' ? 'Tension cardiovasculaire (tendance sur 3 jours)' : 'Cardiovascular strain (3-day trend)',
      detail:
        lang === 'fr'
          ? 'Fréquence cardiaque ou tension élevée sur 3 jours : réduisez l’effort intense et surveillez de près.'
          : 'Elevated heart rate or blood pressure over 3 days: reduce intense effort and monitor closely.',
      indicators: ['heart_rate', 'blood_pressure'],
    })
  }

  const rank = { alert: 2, watch: 1 }
  alerts.sort((a, b) => (rank[b.level] || 0) - (rank[a.level] || 0))

  const fitness = alerts.some((a) => a.level === 'alert')
    ? 'unfit'
    : alerts.some((a) => a.level === 'watch')
      ? 'watch'
      : 'fit'

  return { fitness, indicators, alerts }
}

export function buildAdvice(key, lang = 'fr') {
  const def = INDICATORS[key]
  const a = ADVICE[key]
  if (!def || !a) return null
  return {
    indicator: key,
    label: def.label[lang],
    unit: def.unit,
    how_to_measure: a.how[lang],
    why: a.why[lang],
    hazard: a.hazard[lang],
    actions: { normal: a.actions.normal[lang], watch: a.actions.watch[lang], alert: a.actions.alert[lang] },
    ranges: { normal: def.normal, watch: def.watch },
  }
}
