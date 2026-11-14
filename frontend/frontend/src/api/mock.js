// FAUSSE API (mode mock) : même interface que client.js, mais tout tourne dans le navigateur.
// Sert à développer et à démontrer le front sans backend. Les données vivent dans localStorage.
// ⚠️ Mots de passe en clair et hachage JS : démonstration uniquement, jamais en production.
// Le vrai backend doit reproduire le comportement décrit dans docs/API_CONTRACT.md.

import {
  INDICATOR_KEYS,
  INDICATORS,
  INPUT_LIMITS,
  computeStatus,
  buildAdvice,
  evaluate,
} from './mockRules.js'

// ---------- Session ----------
let currentRole = null
let onUnauthorized = null
export function setToken(t) {
  currentRole = t && t.startsWith('mock.') ? t.slice(5) : null
}
export function setUnauthorizedHandler(fn) {
  onUnauthorized = fn
}

const USERS = {
  astro: { password: 'astro123', role: 'astronaut', name: 'Astronaut' },
  surgeon: { password: 'surgeon123', role: 'flight_surgeon', name: 'Flight surgeon' },
  commander: { password: 'cmd123', role: 'commander', name: 'Commander' },
}

const sleep = (ms) => new Promise((r) => setTimeout(r, ms))

function fail(status, message) {
  const err = new Error(message)
  err.status = status
  throw err
}

function requireAuth(roles) {
  if (!currentRole) {
    if (onUnauthorized) onUnauthorized()
    fail(401, 'Not authenticated')
  }
  if (roles && !roles.includes(currentRole)) fail(403, 'Forbidden for this role')
}

// ---------- SHA-256 (JS pur, synchrone) ----------
const MAX_WORD = 2 ** 32
const K = []
const H0 = []
{
  const composite = {}
  let count = 0
  for (let c = 2; count < 64; c++) {
    if (!composite[c]) {
      for (let i = 0; i < 313; i += c) composite[i] = c
      H0[count] = (Math.pow(c, 0.5) * MAX_WORD) | 0
      K[count++] = (Math.pow(c, 1 / 3) * MAX_WORD) | 0
    }
  }
}
const rotr = (v, a) => (v >>> a) | (v << (32 - a))

export function sha256(input) {
  const ascii = unescape(encodeURIComponent(String(input)))
  const bitLength = ascii.length * 8
  let msg = ascii + '\x80'
  while (msg.length % 64 !== 56) msg += '\x00'
  const words = []
  for (let i = 0; i < msg.length; i++) words[i >> 2] |= msg.charCodeAt(i) << (((3 - i) % 4) * 8)
  words.push((bitLength / MAX_WORD) | 0)
  words.push(bitLength | 0)

  let hash = H0.slice(0, 8)
  for (let j = 0; j < words.length; ) {
    const w = words.slice(j, (j += 16))
    const old = hash
    hash = hash.slice(0, 8)
    for (let i = 0; i < 64; i++) {
      const w15 = w[i - 15]
      const w2 = w[i - 2]
      const a = hash[0]
      const e = hash[4]
      w[i] =
        i < 16
          ? w[i]
          : (w[i - 16] +
              (rotr(w15, 7) ^ rotr(w15, 18) ^ (w15 >>> 3)) +
              w[i - 7] +
              (rotr(w2, 17) ^ rotr(w2, 19) ^ (w2 >>> 10))) |
            0
      const t1 =
        hash[7] +
        (rotr(e, 6) ^ rotr(e, 11) ^ rotr(e, 25)) +
        ((e & hash[5]) ^ (~e & hash[6])) +
        K[i] +
        w[i]
      const t2 =
        (rotr(a, 2) ^ rotr(a, 13) ^ rotr(a, 22)) + ((a & hash[1]) ^ (a & hash[2]) ^ (hash[1] & hash[2]))
      hash = [(t1 + t2) | 0].concat(hash)
      hash[4] = (hash[4] + t1) | 0
    }
    for (let i = 0; i < 8; i++) hash[i] = (hash[i] + old[i]) | 0
  }
  let out = ''
  for (let i = 0; i < 8; i++) {
    for (let j = 3; j + 1; j--) {
      const b = (hash[i] >> (j * 8)) & 255
      out += (b < 16 ? '0' : '') + b.toString(16)
    }
  }
  return out
}

const GENESIS = '0'.repeat(64)
const canonical = (m) =>
  [m.id, m.date, m.indicator, m.value, m.value2 ?? '', m.unit, m.ts, m.prev_hash].join('|')
const hashOf = (m) => sha256(canonical(m))

// ---------- Données de départ (30 jours simulés) ----------
function mulberry32(seed) {
  let a = seed
  return () => {
    a |= 0
    a = (a + 0x6d2b79f5) | 0
    let t = Math.imul(a ^ (a >>> 15), 1 | a)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}
const isoDate = (d) => {
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}
const round = (v, dec) => Number(v.toFixed(dec))

function chainAppend(list, fields) {
  const prev = list.length ? list[list.length - 1] : null
  const m = {
    id: prev ? prev.id + 1 : 1,
    ...fields,
    ts: fields.ts || new Date().toISOString(),
    prev_hash: prev ? prev.hash : GENESIS,
  }
  m.hash = hashOf(m)
  list.push(m)
  return m
}

function seedMeasures() {
  const rand = mulberry32(42)
  const noise = (amp) => (rand() - 0.5) * 2 * amp
  const N = 30
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const list = []
  for (let i = 0; i < N; i++) {
    const d = new Date(today)
    d.setDate(today.getDate() - (N - i)) // dernier jour = hier ; aujourd'hui reste à saisir
    const date = isoDate(d)
    // Dérive progressive sur les 6 derniers jours : scénario de démo (sommeil et humeur en baisse)
    const drift = Math.max(0, i - (N - 6)) / 5
    const calm = 1 - drift * 0.8
    const values = {
      heart_rate: [round(68 + noise(3) + drift * 20, 0)],
      blood_pressure: [round(112 + noise(4) * calm + drift * 24, 0), round(72 + noise(3) * calm + drift * 12, 0)],
      glucose: [round(88 + noise(5) + drift * 8, 0)],
      temperature: [round(36.6 + noise(0.15), 1)],
      sleep: [round(7.5 + noise(0.4) * calm - drift * 2.7, 1)],
      mood: [Math.min(5, Math.max(1, Math.round(4.3 + noise(0.45) * calm - drift * 1.6)))],
      exercise: [round(75 + noise(8) * calm - drift * 35, 0)],
    }
    INDICATOR_KEYS.forEach((key, idx) => {
      const [value, value2] = values[key]
      chainAppend(list, {
        date,
        indicator: key,
        value,
        value2: value2 ?? null,
        unit: INDICATORS[key].unit,
        ts: `${date}T08:${String(idx).padStart(2, '0')}:00.000Z`,
      })
    })
  }
  return list
}

// ---------- État persistant ----------
const STORE_KEY = 'ahm_mock_store_v1'
let state = null

function freshState() {
  return {
    measures: seedMeasures(),
    audit: [],
    groundSeq: 3,
  }
}
function save() {
  try {
    localStorage.setItem(STORE_KEY, JSON.stringify(state))
  } catch {
    /* stockage indisponible : l'état reste en mémoire */
  }
}
function getState() {
  if (state) return state
  try {
    const raw = localStorage.getItem(STORE_KEY)
    if (raw) state = JSON.parse(raw)
  } catch {
    state = null
  }
  if (!state || !Array.isArray(state.measures)) {
    state = freshState()
    save()
  }
  return state
}
function log(type, severity, detail) {
  const s = getState()
  s.audit.unshift({ ts: new Date().toISOString(), type, severity, detail })
  s.audit = s.audit.slice(0, 60)
  save()
}

function verifyChainSync() {
  const { measures } = getState()
  let prevHash = GENESIS
  for (const m of measures) {
    if (m.prev_hash !== prevHash || hashOf(m) !== m.hash) {
      return { valid: false, broken_at: m.id, checked: measures.length }
    }
    prevHash = m.hash
  }
  return { valid: true, broken_at: null, checked: measures.length }
}

const withStatus = (m) => ({ ...m, status: evaluate(m.indicator, m.value, m.value2) })

// ---------- Fonctions exposées (mêmes noms que client.js) ----------
export async function login(username, password) {
  await sleep(250)
  const u = USERS[username]
  if (!u || u.password !== password) fail(401, 'Invalid credentials')
  currentRole = u.role
  getState()
  log('login', 'info', `Login: ${username} (${u.role})`)
  return { token: `mock.${u.role}`, role: u.role, name: u.name }
}

export async function getStatus(lang = 'fr') {
  await sleep(120)
  requireAuth(['astronaut'])
  return computeStatus(getState().measures, lang)
}

export async function getMeasures(indicator) {
  await sleep(120)
  requireAuth(['astronaut'])
  const list = getState().measures.filter((m) => !indicator || m.indicator === indicator)
  return list.map(withStatus)
}

export async function addMeasure(input) {
  await sleep(200)
  requireAuth(['astronaut'])
  const key = input.indicator
  if (!INDICATORS[key]) fail(422, 'Unknown indicator')
  const value = Number(input.value)
  const value2 = input.value2 == null || input.value2 === '' ? null : Number(input.value2)
  const [lo, hi] = INPUT_LIMITS[key]
  if (!Number.isFinite(value) || value < lo || value > hi) fail(422, `Value out of range (${lo}–${hi})`)
  if (key === 'blood_pressure') {
    if (!Number.isFinite(value2) || value2 < 30 || value2 >= value) fail(422, 'Invalid diastolic value')
  }
  if (!/^\d{4}-\d{2}-\d{2}$/.test(input.date || '')) fail(422, 'Invalid date')
  if (input.date > isoDate(new Date())) fail(422, 'Date in the future')

  const s = getState()
  const m = chainAppend(s.measures, {
    date: input.date,
    indicator: key,
    value,
    value2: key === 'blood_pressure' ? value2 : null,
    unit: INDICATORS[key].unit,
  })
  save()
  log('measure_added', 'info', `${key} = ${value}${value2 ? '/' + value2 : ''} (#${m.id}, signed + chained)`)
  return withStatus(m)
}

export async function getAdvice(indicator, lang = 'fr') {
  await sleep(80)
  requireAuth(['astronaut'])
  const a = buildAdvice(indicator, lang)
  if (!a) fail(404, 'Unknown indicator')
  return a
}

const ENV_DELAY = { iss: 0.6, moon: 1.3, mars: 720 }

export async function getGroundSummary(env = 'mars', lang = 'fr') {
  await sleep(150)
  requireAuth()
  const s = getState()
  const status = computeStatus(s.measures, lang)
  const ver = verifyChainSync()
  s.groundSeq += 1
  const generated = new Date()
  const delay = ENV_DELAY[env] ?? 720
  const packet = {
    env,
    seq: s.groundSeq,
    delay_seconds: delay,
    generated_at: generated.toISOString(),
    received_at: new Date(generated.getTime() + delay * 1000).toISOString(),
    encrypted: true,
    signature_valid: ver.valid,
    fitness: status.fitness,
  }
  packet.payload_hash = sha256(JSON.stringify(packet) + (s.measures[s.measures.length - 1]?.hash || ''))
  save()
  log('ground_send', 'info', `Summary #${packet.seq} sent to ground (${env}, delay ${delay}s) for role ${currentRole}`)
  if (currentRole === 'commander') return packet // aptitude seulement
  return {
    ...packet,
    // Statuts uniquement : jamais de valeurs brutes vers le sol
    indicators: status.indicators.map((i) => ({
      indicator: i.indicator,
      label: i.label,
      status: i.status,
      trend: i.trend,
    })),
    alerts: status.alerts.map((a) => ({ level: a.level, title: a.title })),
  }
}

export async function verifyIntegrity() {
  await sleep(200)
  requireAuth(['astronaut'])
  const res = verifyChainSync()
  // On ne journalise que les échecs : l'interface vérifie à chaque rafraîchissement, le journal resterait illisible.
  if (!res.valid) log('integrity_check', 'critical', `Chain BROKEN at measurement #${res.broken_at}`)
  return res
}

export async function getAuditLog() {
  await sleep(80)
  requireAuth(['astronaut'])
  return getState().audit
}

export async function attack(type) {
  await sleep(250)
  requireAuth(['astronaut'])
  const s = getState()
  if (type === 'tamper') {
    const target = [...s.measures].reverse().find((m) => m.indicator === 'sleep')
    const before = target.value
    target.value = 7.5 // la valeur change, mais le hash stocké n'est PAS recalculé
    save()
    log('attack_tamper', 'critical', `Measurement #${target.id} (sleep) changed ${before} → 7.5 without recomputing its hash`)
    return { ok: true, detail: `Measurement #${target.id} modified: sleep ${before} → 7.5` }
  }
  if (type === 'replay') {
    const oldSeq = Math.max(1, s.groundSeq - 1)
    log('replay_rejected', 'warn', `Replayed packet seq=${oldSeq} rejected (last accepted seq=${s.groundSeq})`)
    return { ok: true, rejected: true, detail: `Packet seq=${oldSeq} rejected: already processed` }
  }
  fail(422, 'Unknown attack type')
}

export async function resetDemo() {
  await sleep(150)
  requireAuth(['astronaut'])
  state = freshState()
  save()
  log('reset', 'info', 'Demo data reset')
  return { ok: true }
}
