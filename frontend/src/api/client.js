// Adaptateur HTTP vers le VRAI backend FastAPI de l'équipe (routes /auth/login et /vitals/*).
// Il traduit le vocabulaire de la base (codes HR/SBP/DBP…, statuts green/yellow/red, mesures séparées)
// vers celui de l'interface (heart_rate, blood_pressure…, normal/watch/alert). Les composants ne voient donc aucune différence
// avec la fausse API (mock.js) : mêmes fonctions, mêmes formes de données.
//
// Toutes les routes passent par /api : Vite (dev) ou nginx (Docker) retire le préfixe /api et relaie vers le backend.
import { trendAlerts, trendOf } from './mockRules.js'

const BASE = import.meta.env.VITE_API_URL || '/api'

// Ce que le vrai backend sait faire aujourd'hui. Mettre à true quand les routes existent côté API.
export const CAPS = { ground: false, security: false, roles: false }

let token = null
let onUnauthorized = null
export function setToken(t) {
  token = t
}
export function setUnauthorizedHandler(fn) {
  onUnauthorized = fn
}

async function request(path, { method = 'GET', body } = {}) {
  const headers = { 'Content-Type': 'application/json' }
  if (token) headers.Authorization = `Bearer ${token}`
  const res = await fetch(BASE + path, { method, headers, body: body ? JSON.stringify(body) : undefined })
  if (!res.ok) {
    let detail = res.statusText
    try {
      const data = await res.json()
      if (typeof data.detail === 'string') detail = data.detail
      else if (Array.isArray(data.detail)) detail = data.detail.map((d) => d.msg).join(', ')
    } catch {
      /* réponse non JSON */
    }
    const err = new Error(detail)
    err.status = res.status
    // 401 sur /auth/login = mauvais identifiants (pas une session expirée)
    if (res.status === 401 && onUnauthorized && path !== '/auth/login') onUnauthorized()
    throw err
  }
  return res.json()
}

// ---------- Correspondance base de données → interface ----------
// SBP et DBP sont deux indicateurs en base ; l'interface n'en montre qu'un (« tension », value = systolique, value2 = diastolique).
const KEY = {
  HR: 'heart_rate', SBP: 'blood_pressure', GLU: 'glucose', TEMP: 'temperature', SLEEP: 'sleep',
  MOOD: 'mood', STRESS: 'stress', SPO2: 'spo2', RAD: 'radiation', EXER: 'exercise',
}
const ORDER = Object.values(KEY)
const CODE = Object.fromEntries(Object.entries(KEY).map(([c, k]) => [k, c]))
const DECIMALS = { temperature: 1, sleep: 1, radiation: 1 }
const FR = {
  heart_rate: 'Fréquence cardiaque', blood_pressure: 'Tension artérielle', glucose: 'Glycémie (à jeun)',
  temperature: 'Température', sleep: 'Sommeil', mood: 'Humeur', stress: 'Stress', spo2: 'Saturation en oxygène',
  radiation: 'Dose de radiation', exercise: 'Exercice',
}
const EN = {
  heart_rate: 'Heart rate', blood_pressure: 'Blood pressure', glucose: 'Blood glucose (fasting)',
  temperature: 'Body temperature', sleep: 'Sleep', mood: 'Mood', stress: 'Stress', spo2: 'Blood oxygen',
  radiation: 'Radiation dose', exercise: 'Exercise',
}
const STATUS = { green: 'normal', yellow: 'watch', red: 'alert' }
const RANK = { normal: 0, watch: 1, alert: 2 }
const worst = (a, b) => (RANK[b] > RANK[a] ? b : a)
const fixUnit = (u) => (u || '').replace('Â°', '°') // texte mal encodé dans le SQL de la branche IA

let cache = { indicators: null, recs: null, latest: [] }

async function loadIndicators() {
  if (!cache.indicators) cache.indicators = await request('/vitals/indicators')
  return cache.indicators
}
async function loadRecs() {
  if (!cache.recs) {
    try {
      cache.recs = await request('/vitals/recommendations')
    } catch {
      cache.recs = [] // route absente (backend non patché) : l'interface affiche seulement les textes de base
    }
  }
  return cache.recs
}

const isoDay = (ts) => {
  const d = new Date(ts)
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

// Transforme les lignes de la base en mesures de l'interface (SBP + DBP prises ensemble → une seule mesure « tension »).
function toMeasures(rows, byId) {
  const out = []
  const dia = new Map() // measured_at → ligne DBP
  for (const r of rows) if (byId[r.indicator_id]?.code === 'DBP') dia.set(r.measured_at, r)
  for (const r of rows) {
    const code = byId[r.indicator_id]?.code
    const key = KEY[code]
    if (!key) continue
    const m = {
      id: r.id,
      date: isoDay(r.measured_at),
      ts: r.measured_at,
      indicator: key,
      value: Number(r.value),
      value2: null,
      unit: fixUnit(r.unit),
      status: STATUS[r.status] || 'nodata',
    }
    if (key === 'blood_pressure') {
      const d = dia.get(r.measured_at)
      m.value2 = d ? Number(d.value) : null
      if (d) m.status = worst(m.status, STATUS[d.status] || 'normal')
    }
    out.push(m)
  }
  return out
}

// ---------- Fonctions exposées (mêmes noms que mock.js) ----------
export async function login(astronautId, passcode) {
  const id = Number(String(astronautId).replace(/\D/g, ''))
  if (!id) {
    const err = new Error('Identifiant invalide')
    err.status = 401
    throw err
  }
  const data = await request('/auth/login', { method: 'POST', body: { astronaut_id: id, passcode } })
  cache = { indicators: null, recs: null, latest: [] }
  return { token: data.access_token, role: 'astronaut', name: data.astronaut?.name }
}

export async function logout() {
  try {
    await request('/auth/logout', { method: 'POST' }) // trace la déconnexion dans l'audit_log
  } catch {
    /* le jeton est de toute façon effacé côté navigateur */
  }
}

async function loadMeasures() {
  const [inds, rows] = await Promise.all([loadIndicators(), request('/vitals/measurements?limit=5000')])
  const byId = Object.fromEntries(inds.map((i) => [i.id, i]))
  return toMeasures(rows, byId)
}

export async function getMeasures(indicator) {
  const all = await loadMeasures()
  return indicator ? all.filter((m) => m.indicator === indicator) : all
}

export async function getStatus(lang = 'fr') {
  const [inds, latestRows, alertRows, measures] = await Promise.all([
    loadIndicators(),
    request('/vitals/status/latest'),
    request('/vitals/alerts?resolved=false'),
    loadMeasures(),
  ])
  cache.latest = latestRows
  const byCode = Object.fromEntries(inds.map((i) => [i.code, i]))
  const names = lang === 'fr' ? FR : EN

  const indicators = ORDER.filter((k) => byCode[CODE[k]]).map((key) => {
    const def = byCode[CODE[key]]
    const list = measures.filter((m) => m.indicator === key)
    const latest = list[list.length - 1] || null
    return {
      indicator: key,
      label: names[key],
      unit: fixUnit(def.unit),
      decimals: DECIMALS[key] ?? 0,
      latest: latest ? { id: latest.id, date: latest.date, value: latest.value, value2: latest.value2 } : null,
      status: latest ? latest.status : 'nodata',
      trend: trendOf(list),
      thresholds: { normal: [def.normal_min, def.normal_max], watch: [def.warn_min, def.warn_max] },
    }
  })

  // Alertes : celles générées par le trigger de la base (texte en anglais) + règles de tendance sur plusieurs jours
  const idToKey = Object.fromEntries(inds.map((i) => [i.id, KEY[i.code] || (i.code === 'DBP' ? 'blood_pressure' : null)]))
  const dbAlerts = alertRows.map((a) => ({
    id: `db-${a.id}`,
    level: STATUS[a.level] || 'watch',
    title: names[idToKey[a.indicator_id]] || 'Alerte',
    detail: a.message,
    indicators: [idToKey[a.indicator_id]].filter(Boolean),
  }))
  // une seule alerte par indicateur (la plus grave, puis la plus récente) pour ne pas noyer l'écran
  const seen = new Map()
  for (const a of dbAlerts) {
    const k = a.indicators[0]
    if (!seen.has(k) || RANK[a.level] > RANK[seen.get(k).level]) seen.set(k, a)
  }
  const alerts = [...trendAlerts(measures, lang, { moodLow: 5 }), ...seen.values()]
  alerts.sort((a, b) => RANK[b.level] - RANK[a.level])

  const fitness = indicators.some((i) => i.status === 'alert') || alerts.some((a) => a.level === 'alert')
    ? 'unfit'
    : indicators.some((i) => i.status === 'watch') || alerts.some((a) => a.level === 'watch')
      ? 'watch'
      : 'fit'
  return { fitness, indicators, alerts }
}

export async function addMeasure({ indicator, value, value2 }) {
  const inds = await loadIndicators()
  const byCode = Object.fromEntries(inds.map((i) => [i.code, i]))
  const post = (code, v) =>
    request('/vitals/measurements', {
      method: 'POST',
      body: { indicator_id: byCode[code].id, value: v, source: 'manual' },
    })
  // La tension = 2 mesures en base (systolique puis diastolique) enregistrées avec le même instant
  const first = await post(CODE[indicator], value)
  let alert = first.alert
  if (indicator === 'blood_pressure' && value2 != null) {
    const second = await post('DBP', value2)
    alert = alert || second.alert
  }
  const level = alert?.level || alert?.status
  return {
    id: first.measurement_id,
    indicator,
    status: STATUS[level] || 'normal',
    hash: null, // pas de chaîne de hachage dans la base actuelle
  }
}

export async function getAdvice(indicator, lang = 'fr') {
  const [inds, recs] = await Promise.all([loadIndicators(), loadRecs()])
  const byCode = Object.fromEntries(inds.map((i) => [i.code, i]))
  const main = byCode[CODE[indicator]]
  if (!main) {
    const err = new Error('Indicateur inconnu')
    err.status = 404
    throw err
  }
  const codes = indicator === 'blood_pressure' ? ['SBP', 'DBP'] : [CODE[indicator]]
  const ids = codes.map((c) => byCode[c].id)
  // Sens du dernier dépassement (low/high) pour choisir la bonne action
  const lastRow = cache.latest.find((r) => ids.includes(r.indicator_id) && r.status !== 'green')
  const pick = (severity) => {
    const list = recs.filter((r) => ids.includes(r.indicator_id) && r.severity === severity)
    const same = lastRow?.direction ? list.filter((r) => r.direction === lastRow.direction) : []
    return (same.length ? same : list).map((r) => r.action_text).join(' ')
  }
  const fallback = lang === 'fr' ? 'Aucune recommandation enregistrée.' : 'No recommendation recorded.'
  return {
    indicator,
    label: (lang === 'fr' ? FR : EN)[indicator],
    unit: fixUnit(main.unit),
    how_to_measure: main.how_to_measure,
    why: main.why_it_matters,
    hazard: main.space_effect,
    actions: {
      normal: lang === 'fr' ? 'Valeur dans la plage normale : continuez.' : 'Value in the normal range: keep going.',
      watch: pick('yellow') || fallback,
      alert: pick('red') || fallback,
    },
    ranges: { normal: [main.normal_min, main.normal_max], watch: [main.warn_min, main.warn_max] },
  }
}

// ---------- Pas encore disponibles côté backend (voir CAPS) ----------
const missing = async () => {
  const err = new Error('Not available on this backend')
  err.status = 501
  throw err
}
export const getGroundSummary = missing
export const getAuditLog = missing
export const attack = missing
export const resetDemo = missing
export const verifyIntegrity = async () => null // pas de chaîne de hachage : aucune bannière d'intégrité
