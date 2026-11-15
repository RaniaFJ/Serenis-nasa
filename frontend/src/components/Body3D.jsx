import { useEffect, useRef } from 'react'
import * as THREE from 'three'
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js'
import { STATUS_COLOR } from '../content/format'

// Corps humain en 3D (three.js) : silhouette « radiographie » (halo sur les bords), squelette visible à l'intérieur,
// et des repères cliquables colorés selon l'état de santé de chaque zone. On tourne autour avec la souris / le doigt.
// Rien n'est chargé tant que l'onglet « Corps humain » n'est pas ouvert (voir BodyMap.jsx : import différé).

const SPOTS = [
  { zone: 'brain', pos: [0, 1.73, -0.02], r: 0.036 },
  { zone: 'eyes', pos: [-0.042, 1.665, 0.098], r: 0.013 },
  { zone: 'eyes', pos: [0.042, 1.665, 0.098], r: 0.013 },
  { zone: 'immune', pos: [-0.085, 1.395, 0.075], r: 0.03 },
  { zone: 'heart', pos: [0.06, 1.28, 0.08], r: 0.04 },
  { zone: 'metabolism', pos: [0, 1.04, 0.085], r: 0.045 },
  { zone: 'bones', pos: [-0.105, 0.62, 0.045], r: 0.036 },
  { zone: 'bones', pos: [0.105, 0.62, 0.045], r: 0.036 },
]
const NEUTRAL = '#7fb8ff' // zone sans indicateur (yeux) : pas une couleur d'état

function halo(color) {
  const c = document.createElement('canvas')
  c.width = c.height = 64
  const g = c.getContext('2d')
  const grd = g.createRadialGradient(32, 32, 0, 32, 32, 32)
  grd.addColorStop(0, color)
  grd.addColorStop(0.35, color + '88')
  grd.addColorStop(1, color + '00')
  g.fillStyle = grd
  g.fillRect(0, 0, 64, 64)
  return new THREE.CanvasTexture(c)
}

const xray = (color = 0x6fb2ff) =>
  new THREE.ShaderMaterial({
    transparent: true,
    depthWrite: false,
    side: THREE.DoubleSide,
    blending: THREE.AdditiveBlending,
    uniforms: { uColor: { value: new THREE.Color(color) } },
    vertexShader: `
      varying vec3 vN; varying vec3 vV;
      void main() {
        vec4 mv = modelViewMatrix * vec4(position, 1.0);
        vN = normalize(normalMatrix * normal);
        vV = normalize(-mv.xyz);
        gl_Position = projectionMatrix * mv;
      }`,
    fragmentShader: `
      uniform vec3 uColor; varying vec3 vN; varying vec3 vV;
      void main() {
        float f = pow(1.0 - abs(dot(normalize(vN), normalize(vV))), 2.4);
        gl_FragColor = vec4(uColor, f * 0.9 + 0.045);
      }`,
  })

function buildBody(disposables) {
  const body = new THREE.Group()
  const skin = xray()
  const bone = new THREE.MeshBasicMaterial({ color: 0xbcd6ff, transparent: true, opacity: 0.5, depthWrite: false })
  disposables.push(skin, bone)
  const add = (geo, mat, pos, rot = [0, 0, 0], scale = [1, 1, 1]) => {
    disposables.push(geo)
    const m = new THREE.Mesh(geo, mat)
    m.position.set(...pos)
    m.rotation.set(...rot)
    m.scale.set(...scale)
    body.add(m)
    return m
  }
  const mirror = (fn) => [-1, 1].forEach(fn)

  // Peau : tête, cou, tronc (révolution), bras, jambes
  add(new THREE.SphereGeometry(0.105, 32, 24), skin, [0, 1.69, 0], [0, 0, 0], [0.92, 1.1, 1])
  add(new THREE.CylinderGeometry(0.045, 0.052, 0.11, 20), skin, [0, 1.55, 0])
  const profile = [
    [0.02, 0.86], [0.14, 0.88], [0.165, 0.97], [0.15, 1.1], [0.158, 1.24], [0.2, 1.37], [0.215, 1.45], [0.16, 1.5], [0.05, 1.52],
  ].map(([r, y]) => new THREE.Vector2(r, y))
  add(new THREE.LatheGeometry(profile, 36), skin, [0, 0, 0], [0, 0, 0], [1.12, 1, 0.66])
  mirror((s) => {
    add(new THREE.CapsuleGeometry(0.044, 0.27, 6, 14), skin, [s * 0.255, 1.3, 0], [0, 0, s * 0.12])
    add(new THREE.CapsuleGeometry(0.037, 0.27, 6, 14), skin, [s * 0.305, 1.0, 0.01], [0, 0, s * 0.07])
    add(new THREE.SphereGeometry(0.04, 14, 12), skin, [s * 0.32, 0.8, 0.015], [0, 0, 0], [0.8, 1.1, 0.6])
    add(new THREE.CapsuleGeometry(0.076, 0.36, 6, 16), skin, [s * 0.1, 0.62, 0])
    add(new THREE.CapsuleGeometry(0.056, 0.36, 6, 16), skin, [s * 0.1, 0.22, 0])
    add(new THREE.BoxGeometry(0.09, 0.05, 0.19), skin, [s * 0.1, 0.025, 0.04])
  })

  // Squelette : colonne, côtes, bassin, os longs
  for (let i = 0; i < 17; i++) {
    const y = 0.93 + i * 0.039
    add(new THREE.CylinderGeometry(0.017, 0.017, 0.022, 8), bone, [0, y, -0.045])
  }
  for (let i = 0; i < 6; i++) {
    const y = 1.2 + i * 0.047
    const r = 0.1 + Math.sin((i / 5) * Math.PI) * 0.05
    add(new THREE.TorusGeometry(r, 0.0045, 6, 28, Math.PI * 1.55), bone, [0, y, -0.01], [Math.PI / 2, 0, Math.PI * 0.725], [1.05, 0.66, 1])
  }
  add(new THREE.TorusGeometry(0.115, 0.011, 8, 32), bone, [0, 0.93, 0], [Math.PI / 2, 0, 0], [1.2, 0.7, 1])
  mirror((s) => {
    add(new THREE.CapsuleGeometry(0.014, 0.34, 4, 8), bone, [s * 0.1, 0.62, 0])
    add(new THREE.CapsuleGeometry(0.011, 0.34, 4, 8), bone, [s * 0.1, 0.22, 0])
    add(new THREE.CapsuleGeometry(0.01, 0.25, 4, 8), bone, [s * 0.255, 1.3, 0], [0, 0, s * 0.12])
    add(new THREE.CapsuleGeometry(0.009, 0.25, 4, 8), bone, [s * 0.305, 1.0, 0.01], [0, 0, s * 0.07])
    add(new THREE.CapsuleGeometry(0.008, 0.1, 4, 8), bone, [s * 0.11, 1.46, 0.0], [0, 0, Math.PI / 2 + s * 0.12])
  })
  add(new THREE.SphereGeometry(0.075, 20, 16), bone, [0, 1.69, 0], [0, 0, 0], [0.9, 1.05, 1])
  return body
}

export default function Body3D({ zoneStatus, selected, onSelect, onUnavailable, label }) {
  const mount = useRef(null)
  const api = useRef({})
  const latest = useRef({ zoneStatus, selected, onSelect })
  latest.current = { zoneStatus, selected, onSelect }

  useEffect(() => {
    const el = mount.current
    const disposables = []
    let renderer
    try {
      renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true })
    } catch {
      onUnavailable?.()
      return undefined
    }
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2))
    el.appendChild(renderer.domElement)
    renderer.domElement.style.display = 'block'
    renderer.domElement.style.touchAction = 'pan-y'

    const reduceMotion = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches
    const scene = new THREE.Scene()
    const camera = new THREE.PerspectiveCamera(32, 1, 0.1, 50)
    camera.position.set(1.35, 1.2, 3.2)
    const controls = new OrbitControls(camera, renderer.domElement)
    controls.target.set(0, 0.92, 0)
    controls.enablePan = false
    controls.enableDamping = true
    controls.minDistance = 1.8
    controls.maxDistance = 6
    controls.minPolarAngle = Math.PI * 0.3
    controls.maxPolarAngle = Math.PI * 0.62
    controls.autoRotate = !reduceMotion
    controls.autoRotateSpeed = 0.9
    controls.addEventListener('start', () => (controls.autoRotate = false))

    scene.add(buildBody(disposables))

    // Sol : deux anneaux fins, comme une plateforme d'essai
    ;[0.55, 0.85].forEach((r, i) => {
      const geo = new THREE.RingGeometry(r, r + 0.006, 96)
      const mat = new THREE.MeshBasicMaterial({ color: 0x4d7bbf, transparent: true, opacity: i ? 0.25 : 0.5, side: THREE.DoubleSide })
      disposables.push(geo, mat)
      const ring = new THREE.Mesh(geo, mat)
      ring.rotation.x = -Math.PI / 2
      scene.add(ring)
    })

    // Repères de zone
    const hit = []
    const spots = SPOTS.map((s) => {
      const coreMat = new THREE.MeshBasicMaterial({ color: NEUTRAL })
      const coreGeo = new THREE.SphereGeometry(s.r, 20, 16)
      const hitMat = new THREE.MeshBasicMaterial({ transparent: true, opacity: 0, depthWrite: false })
      const hitGeo = new THREE.SphereGeometry(Math.max(s.r * 2.2, 0.05), 12, 10)
      const haloMat = new THREE.SpriteMaterial({ color: 0xffffff, transparent: true, depthWrite: false, depthTest: false })
      disposables.push(coreMat, coreGeo, hitMat, hitGeo, haloMat)
      const g = new THREE.Group()
      g.position.set(...s.pos)
      const core = new THREE.Mesh(coreGeo, coreMat)
      core.renderOrder = 3
      const hm = new THREE.Mesh(hitGeo, hitMat)
      hm.userData.zone = s.zone
      const sprite = new THREE.Sprite(haloMat)
      sprite.renderOrder = 2
      g.add(core, hm, sprite)
      scene.add(g)
      hit.push(hm)
      return { ...s, g, core, coreMat, sprite, haloMat, base: s.r }
    })
    const textures = {}
    const tex = (c) => (textures[c] ||= (disposables.push(halo(c)), disposables[disposables.length - 1]))

    function paint() {
      const { zoneStatus: zs, selected: sel } = latest.current
      for (const sp of spots) {
        const st = zs?.[sp.zone]
        const color = st && st !== 'nodata' ? STATUS_COLOR[st] : NEUTRAL
        sp.coreMat.color.set(color)
        sp.haloMat.map = tex(color)
        sp.haloMat.needsUpdate = true
        sp.alert = st === 'alert'
        sp.active = sel === sp.zone
      }
    }
    paint()
    api.current.paint = paint

    // Clic / toucher sur un repère (on ignore les glissements = rotation)
    const ray = new THREE.Raycaster()
    const ndc = new THREE.Vector2()
    const pick = (e) => {
      const r = renderer.domElement.getBoundingClientRect()
      ndc.set(((e.clientX - r.left) / r.width) * 2 - 1, -((e.clientY - r.top) / r.height) * 2 + 1)
      ray.setFromCamera(ndc, camera)
      return ray.intersectObjects(hit, false)[0]?.object.userData.zone
    }
    let down = null
    const onDown = (e) => (down = { x: e.clientX, y: e.clientY })
    const onUp = (e) => {
      if (!down || Math.hypot(e.clientX - down.x, e.clientY - down.y) > 5) return
      const z = pick(e)
      if (z) latest.current.onSelect(z)
    }
    const onMove = (e) => {
      renderer.domElement.style.cursor = pick(e) ? 'pointer' : 'grab'
    }
    renderer.domElement.addEventListener('pointerdown', onDown)
    renderer.domElement.addEventListener('pointerup', onUp)
    renderer.domElement.addEventListener('pointermove', onMove)

    const resize = () => {
      const w = el.clientWidth
      const h = el.clientHeight
      renderer.setSize(w, h, false)
      renderer.domElement.style.width = '100%'
      renderer.domElement.style.height = '100%'
      camera.aspect = w / h
      camera.updateProjectionMatrix()
    }
    const ro = new ResizeObserver(resize)
    ro.observe(el)
    resize()

    let raf
    const clock = new THREE.Clock()
    const tick = () => {
      const t = clock.getElapsedTime()
      controls.update()
      for (const sp of spots) {
        const pulse = sp.alert && !reduceMotion ? 1 + 0.25 * Math.sin(t * 4) : 1
        const k = (sp.active ? 1.55 : 1) * pulse
        sp.core.scale.setScalar(k)
        const h = sp.base * (sp.active ? 8 : 5) * pulse
        sp.sprite.scale.set(h, h, 1)
        sp.haloMat.opacity = sp.active ? 0.85 : 0.5
      }
      renderer.render(scene, camera)
      raf = requestAnimationFrame(tick)
    }
    tick()

    return () => {
      cancelAnimationFrame(raf)
      ro.disconnect()
      renderer.domElement.removeEventListener('pointerdown', onDown)
      renderer.domElement.removeEventListener('pointerup', onUp)
      renderer.domElement.removeEventListener('pointermove', onMove)
      controls.dispose()
      disposables.forEach((d) => d.dispose?.())
      renderer.dispose()
      renderer.domElement.remove()
    }
  }, [onUnavailable])

  useEffect(() => {
    api.current.paint?.()
  }, [zoneStatus, selected])

  return <div ref={mount} className="h-full w-full" role="img" aria-label={label} />
}
