// Client HTTP vers le VRAI backend FastAPI.
// Toutes les routes passent par /api : Vite (dev) ou nginx (Docker) retire le préfixe /api
// et relaie vers http://backend:8000. Le navigateur ne parle donc jamais directement à la base de données.

const BASE = import.meta.env.VITE_API_URL || '/api'

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
  const res = await fetch(BASE + path, {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined,
  })
  if (!res.ok) {
    let detail = res.statusText
    try {
      const data = await res.json()
      detail = typeof data.detail === 'string' ? data.detail : detail
    } catch {
      /* réponse non JSON */
    }
    const err = new Error(detail)
    err.status = res.status
    if (res.status === 401 && onUnauthorized) onUnauthorized()
    throw err
  }
  return res.json()
}

export const login = (username, password) =>
  request('/auth/login', { method: 'POST', body: { username, password } })

export const getStatus = (lang) => request(`/status?lang=${lang}`)

export const getMeasures = (indicator) =>
  request(`/measures${indicator ? `?indicator=${encodeURIComponent(indicator)}` : ''}`)

export const addMeasure = (measure) => request('/measures', { method: 'POST', body: measure })

export const getAdvice = (indicator, lang) =>
  request(`/advice/${encodeURIComponent(indicator)}?lang=${lang}`)

export const getGroundSummary = (env, lang) =>
  request(`/ground/summary?env=${env}&lang=${lang}`)

export const verifyIntegrity = () => request('/integrity/verify')

export const getAuditLog = () => request('/security/events')

export const attack = (type) => request('/demo/attack', { method: 'POST', body: { type } })

export const resetDemo = () => request('/demo/reset', { method: 'POST' })
