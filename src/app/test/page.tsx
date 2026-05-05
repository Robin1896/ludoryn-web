'use client'
import { useState, useEffect } from 'react'

const REPO = 'Robin1896/ludoryn-web'
const BRANCH = 'test-results'
const RAW = `https://raw.githubusercontent.com/${REPO}/${BRANCH}`
const PASSWORD = 'ludoryn2026'

const BG = '#f0ebe3'
const CARD = '#ffffff'
const BORDER = '#e2d9cf'
const ACCENT = '#b5412a'
const TEXT = '#1a1514'
const MUTED = '#9a8f87'

const SCREENSHOTS = [
  { name: '01-home', label: 'Home' },
  { name: '02-lobby', label: 'Lobby' },
  { name: '03-grub', label: 'Grub Hunt' },
  { name: '04-flikflak', label: 'Flikflak' },
  { name: '05-bommen', label: '1000 Bommen' },
  { name: '06-carcassonne', label: 'Carcassonne' },
  { name: '07-qwixx', label: 'Kriskras' },
  { name: '08-scores', label: 'Scores' },
]

interface Meta { run: number; sha: string; timestamp: string; passed: number; failed: number }
interface TestSpec { title: string; ok: boolean; tests: { status: string; duration: number }[] }
interface TestSuite { title: string; suites?: TestSuite[]; specs?: TestSpec[] }
interface Report { suites?: TestSuite[]; stats?: { expected: number; unexpected: number; duration: number } }

function flattenSpecs(suite: TestSuite, file = ''): { file: string; title: string; ok: boolean; duration: number }[] {
  const results: { file: string; title: string; ok: boolean; duration: number }[] = []
  const walk = (s: TestSuite, f: string) => {
    s.specs?.forEach(spec => results.push({ file: f, title: spec.title, ok: spec.ok, duration: spec.tests?.[0]?.duration ?? 0 }))
    s.suites?.forEach(sub => walk(sub, f || s.title))
  }
  walk(suite, file || suite.title)
  return results
}

export default function TestPage() {
  const [auth, setAuth] = useState(false)
  const [pw, setPw] = useState('')
  const [error, setError] = useState('')
  const [meta, setMeta] = useState<Meta | null>(null)
  const [report, setReport] = useState<Report | null>(null)
  const [loading, setLoading] = useState(false)
  const [activeShot, setActiveShot] = useState<string | null>(null)

  useEffect(() => { setAuth(document.cookie.includes('test_auth=1')) }, [])

  useEffect(() => {
    if (!auth) return
    setLoading(true)
    Promise.all([
      fetch(`${RAW}/meta.json`).then(r => r.json()).catch(() => null),
      fetch(`${RAW}/report.json`).then(r => r.json()).catch(() => null),
    ]).then(([m, r]) => { setMeta(m); setReport(r); setLoading(false) })
  }, [auth])

  const login = () => {
    if (pw === PASSWORD) {
      document.cookie = 'test_auth=1; path=/; max-age=86400'
      setAuth(true); setError('')
    } else {
      setError('Verkeerd wachtwoord')
    }
  }

  if (!auth) return (
    <div style={{ minHeight: '100vh', background: BG, display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: 'system-ui,sans-serif' }}>
      <div style={{ background: CARD, border: `1px solid ${BORDER}`, borderRadius: 20, padding: 40, width: 340, boxShadow: '0 2px 20px rgba(0,0,0,0.06)' }}>
        <div style={{ fontSize: 13, fontWeight: 700, letterSpacing: 3, color: MUTED, textTransform: 'uppercase', marginBottom: 6 }}>Ludoryn</div>
        <div style={{ fontSize: 28, fontWeight: 800, color: TEXT, marginBottom: 28, fontFamily: 'Georgia,serif' }}>Test Dashboard</div>
        <input type="password" value={pw} onChange={e => setPw(e.target.value)} onKeyDown={e => e.key === 'Enter' && login()}
          placeholder="Wachtwoord..." autoFocus
          style={{ width: '100%', boxSizing: 'border-box', background: BG, border: `1px solid ${BORDER}`, borderRadius: 10, padding: '12px 14px', color: TEXT, fontSize: 15, outline: 'none', marginBottom: 12 }} />
        {error && <div style={{ color: ACCENT, fontSize: 13, marginBottom: 10 }}>{error}</div>}
        <button onClick={login} style={{ width: '100%', padding: 13, borderRadius: 10, border: 'none', background: ACCENT, color: '#fff', fontWeight: 700, fontSize: 15, cursor: 'pointer', letterSpacing: 1 }}>
          INLOGGEN
        </button>
      </div>
    </div>
  )

  const allSpecs = report?.suites?.flatMap(s => flattenSpecs(s)) ?? []
  const passed = allSpecs.filter(s => s.ok).length
  const failed = allSpecs.filter(s => !s.ok).length
  const total = allSpecs.length
  const pct = total > 0 ? Math.round(passed / total * 100) : 0

  const byFile: Record<string, typeof allSpecs> = {}
  allSpecs.forEach(s => {
    const key = s.file.replace(/.*\//, '').replace('.spec.ts', '')
    if (!byFile[key]) byFile[key] = []
    byFile[key].push(s)
  })

  return (
    <div style={{ minHeight: '100vh', background: BG, color: TEXT, fontFamily: 'system-ui,sans-serif', padding: '32px 16px' }}>
      <div style={{ maxWidth: 900, margin: '0 auto' }}>

        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 36 }}>
          <div>
            <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: 3, color: MUTED, textTransform: 'uppercase', marginBottom: 4 }}>Ludoryn · Test Dashboard</div>
            <div style={{ fontSize: 28, fontWeight: 800, color: TEXT, fontFamily: 'Georgia,serif' }}>Playwright Rapporten</div>
          </div>
          <button onClick={() => { document.cookie = 'test_auth=; max-age=0'; setAuth(false) }}
            style={{ background: 'transparent', border: `1px solid ${BORDER}`, color: MUTED, padding: '7px 16px', borderRadius: 8, cursor: 'pointer', fontSize: 13, fontWeight: 600, letterSpacing: 0.5 }}>
            Uitloggen
          </button>
        </div>

        {loading && <div style={{ color: MUTED, textAlign: 'center', padding: 80, fontSize: 16 }}>Laden...</div>}

        {!loading && meta && (
          <>
            {/* Stats */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: 10, marginBottom: 20 }}>
              {[
                { label: 'Run', value: `#${meta.run}`, color: TEXT },
                { label: 'Geslaagd', value: String(passed), color: '#2d7a3a' },
                { label: 'Gefaald', value: String(failed), color: failed > 0 ? ACCENT : MUTED },
                { label: 'Score', value: `${pct}%`, color: pct === 100 ? '#2d7a3a' : pct > 80 ? '#b07520' : ACCENT },
                { label: 'Datum', value: new Date(meta.timestamp).toLocaleString('nl-NL', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' }), color: MUTED },
              ].map(stat => (
                <div key={stat.label} style={{ background: CARD, border: `1px solid ${BORDER}`, borderRadius: 14, padding: '14px 18px' }}>
                  <div style={{ color: MUTED, fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: 1.5, marginBottom: 6 }}>{stat.label}</div>
                  <div style={{ fontSize: 22, fontWeight: 800, color: stat.color, fontFamily: 'Georgia,serif' }}>{stat.value}</div>
                </div>
              ))}
            </div>

            {/* Progress bar */}
            <div style={{ background: BORDER, borderRadius: 8, height: 5, marginBottom: 36, overflow: 'hidden' }}>
              <div style={{ height: '100%', width: `${pct}%`, background: pct === 100 ? '#2d7a3a' : ACCENT, borderRadius: 8, transition: 'width 0.6s ease' }} />
            </div>

            {/* Test resultaten */}
            <div style={{ marginBottom: 48 }}>
              <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: 2, color: MUTED, textTransform: 'uppercase', marginBottom: 14 }}>Test resultaten</div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {Object.entries(byFile).map(([file, specs]) => (
                  <div key={file} style={{ background: CARD, border: `1px solid ${BORDER}`, borderRadius: 14, overflow: 'hidden' }}>
                    <div style={{ display: 'flex', alignItems: 'center', padding: '11px 16px', borderBottom: `1px solid ${BORDER}` }}>
                      <span style={{ fontSize: 12, fontWeight: 700, color: MUTED, flex: 1, letterSpacing: 0.5 }}>{file}</span>
                      <span style={{ fontSize: 12, color: '#2d7a3a', fontWeight: 700, marginRight: 12 }}>✓ {specs.filter(s => s.ok).length}</span>
                      {specs.filter(s => !s.ok).length > 0 && <span style={{ fontSize: 12, color: ACCENT, fontWeight: 700 }}>✗ {specs.filter(s => !s.ok).length}</span>}
                    </div>
                    {specs.map((spec, i) => (
                      <div key={i} style={{ display: 'flex', alignItems: 'center', padding: '9px 16px', borderTop: i > 0 ? `1px solid ${BG}` : 'none' }}>
                        <span style={{ fontSize: 14, marginRight: 10 }}>{spec.ok ? '✅' : '❌'}</span>
                        <span style={{ flex: 1, fontSize: 13, color: spec.ok ? TEXT : ACCENT }}>{spec.title}</span>
                        <span style={{ fontSize: 11, color: BORDER }}>{spec.duration}ms</span>
                      </div>
                    ))}
                  </div>
                ))}
              </div>
            </div>

            {/* Screenshots */}
            <div>
              <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: 2, color: MUTED, textTransform: 'uppercase', marginBottom: 14 }}>Screenshots</div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))', gap: 10 }}>
                {SCREENSHOTS.map(shot => (
                  <div key={shot.name} onClick={() => setActiveShot(shot.name)}
                    style={{ cursor: 'zoom-in', background: CARD, border: `1px solid ${BORDER}`, borderRadius: 14, overflow: 'hidden' }}>
                    <img src={`${RAW}/screenshots/${shot.name}.png`} alt={shot.label}
                      style={{ width: '100%', height: 160, objectFit: 'cover', objectPosition: 'top', display: 'block' }}
                      onError={e => { (e.target as HTMLImageElement).style.display = 'none' }} />
                    <div style={{ padding: '8px 12px', fontSize: 11, color: MUTED, fontWeight: 600, letterSpacing: 0.5 }}>{shot.label}</div>
                  </div>
                ))}
              </div>
            </div>
          </>
        )}

        {!loading && !meta && (
          <div style={{ textAlign: 'center', padding: 80 }}>
            <div style={{ fontSize: 48, marginBottom: 16 }}>⏳</div>
            <div style={{ fontSize: 16, color: TEXT, fontFamily: 'Georgia,serif' }}>Nog geen testresultaten beschikbaar.</div>
            <div style={{ fontSize: 13, marginTop: 8, color: MUTED }}>Push naar main om de eerste run te starten.</div>
          </div>
        )}
      </div>

      {activeShot && (
        <div onClick={() => setActiveShot(null)}
          style={{ position: 'fixed', inset: 0, background: 'rgba(26,21,20,0.9)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, cursor: 'zoom-out' }}>
          <img src={`${RAW}/screenshots/${activeShot}.png`} alt={activeShot}
            style={{ maxHeight: '90vh', maxWidth: '90vw', borderRadius: 16, boxShadow: '0 0 60px rgba(0,0,0,0.5)' }} />
        </div>
      )}
    </div>
  )
}
