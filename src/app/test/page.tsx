'use client'
import { useState, useEffect } from 'react'

const REPO = 'Robin1896/ludoryn-web'
const BRANCH = 'test-results'
const RAW = `https://raw.githubusercontent.com/${REPO}/${BRANCH}`
const PASSWORD = 'ludoryn2026'

const SCREENSHOTS = [
  { name: '01-home', label: 'Home' },
  { name: '02-lobby', label: 'Lobby' },
  { name: '03-grub', label: 'Grub' },
  { name: '04-flikflak', label: 'Flikflak' },
  { name: '05-bommen', label: 'Bommen' },
  { name: '06-carcassonne', label: 'Carcassonne' },
  { name: '07-qwixx', label: 'Qwixx' },
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

  useEffect(() => {
    setAuth(document.cookie.includes('test_auth=1'))
  }, [])

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
    <div style={{ minHeight: '100vh', background: '#0a0a0a', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: 'system-ui,sans-serif' }}>
      <div style={{ background: '#141414', border: '1px solid #222', borderRadius: 16, padding: 40, width: 340 }}>
        <div style={{ fontSize: 28, fontWeight: 800, color: '#fff', marginBottom: 4 }}>🧪 Test Dashboard</div>
        <div style={{ color: '#555', fontSize: 13, marginBottom: 28 }}>Ludoryn · Playwright Reports</div>
        <input type="password" value={pw} onChange={e => setPw(e.target.value)} onKeyDown={e => e.key === 'Enter' && login()}
          placeholder="Wachtwoord..." autoFocus
          style={{ width: '100%', boxSizing: 'border-box', background: '#1a1a1a', border: '1px solid #333', borderRadius: 10, padding: '12px 14px', color: '#fff', fontSize: 15, outline: 'none', marginBottom: 12 }} />
        {error && <div style={{ color: '#ef4444', fontSize: 13, marginBottom: 10 }}>{error}</div>}
        <button onClick={login} style={{ width: '100%', padding: 13, borderRadius: 10, border: 'none', background: '#2563eb', color: '#fff', fontWeight: 700, fontSize: 15, cursor: 'pointer' }}>
          Inloggen
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
    <div style={{ minHeight: '100vh', background: '#0a0a0a', color: '#fff', fontFamily: 'system-ui,sans-serif', padding: '24px 16px' }}>
      <div style={{ maxWidth: 1100, margin: '0 auto' }}>

        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 32 }}>
          <div>
            <div style={{ fontSize: 26, fontWeight: 800 }}>🧪 Test Dashboard</div>
            <div style={{ color: '#444', fontSize: 13, marginTop: 4 }}>Ludoryn · Robin1896/ludoryn-web</div>
          </div>
          <button onClick={() => { document.cookie = 'test_auth=; max-age=0'; setAuth(false) }}
            style={{ background: 'transparent', border: '1px solid #333', color: '#666', padding: '6px 14px', borderRadius: 8, cursor: 'pointer', fontSize: 13 }}>
            Uitloggen
          </button>
        </div>

        {loading && <div style={{ color: '#555', textAlign: 'center', padding: 80, fontSize: 18 }}>Laden...</div>}

        {!loading && meta && (
          <>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: 12, marginBottom: 24 }}>
              {[
                { label: 'Run', value: `#${meta.run}`, color: '#fff' },
                { label: 'Geslaagd', value: String(passed), color: '#22c55e' },
                { label: 'Gefaald', value: String(failed), color: failed > 0 ? '#ef4444' : '#555' },
                { label: 'Score', value: `${pct}%`, color: pct === 100 ? '#22c55e' : pct > 80 ? '#f59e0b' : '#ef4444' },
                { label: 'Datum', value: new Date(meta.timestamp).toLocaleString('nl-NL', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' }), color: '#888' },
              ].map(stat => (
                <div key={stat.label} style={{ background: '#141414', border: '1px solid #1e1e1e', borderRadius: 12, padding: '16px 20px' }}>
                  <div style={{ color: '#444', fontSize: 11, fontWeight: 600, textTransform: 'uppercase', letterSpacing: 1, marginBottom: 6 }}>{stat.label}</div>
                  <div style={{ fontSize: 24, fontWeight: 800, color: stat.color }}>{stat.value}</div>
                </div>
              ))}
            </div>

            <div style={{ background: '#1a1a1a', borderRadius: 8, height: 6, marginBottom: 36, overflow: 'hidden' }}>
              <div style={{ height: '100%', width: `${pct}%`, background: pct === 100 ? '#22c55e' : '#f59e0b', borderRadius: 8 }} />
            </div>

            <div style={{ marginBottom: 48 }}>
              <div style={{ fontWeight: 700, fontSize: 12, marginBottom: 14, color: '#888', textTransform: 'uppercase', letterSpacing: 1 }}>Test resultaten</div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {Object.entries(byFile).map(([file, specs]) => (
                  <div key={file} style={{ background: '#141414', border: '1px solid #1e1e1e', borderRadius: 12, overflow: 'hidden' }}>
                    <div style={{ display: 'flex', alignItems: 'center', padding: '11px 16px', background: '#111' }}>
                      <span style={{ fontSize: 13, fontWeight: 700, color: '#aaa', flex: 1 }}>{file}</span>
                      <span style={{ fontSize: 12, color: '#22c55e', marginRight: 12 }}>✓ {specs.filter(s => s.ok).length}</span>
                      {specs.filter(s => !s.ok).length > 0 && <span style={{ fontSize: 12, color: '#ef4444' }}>✗ {specs.filter(s => !s.ok).length}</span>}
                    </div>
                    {specs.map((spec, i) => (
                      <div key={i} style={{ display: 'flex', alignItems: 'center', padding: '9px 16px', borderTop: '1px solid #1a1a1a' }}>
                        <span style={{ fontSize: 16, marginRight: 12 }}>{spec.ok ? '✅' : '❌'}</span>
                        <span style={{ flex: 1, fontSize: 13, color: spec.ok ? '#d4d4d4' : '#ef4444' }}>{spec.title}</span>
                        <span style={{ fontSize: 11, color: '#333' }}>{spec.duration}ms</span>
                      </div>
                    ))}
                  </div>
                ))}
              </div>
            </div>

            <div>
              <div style={{ fontWeight: 700, fontSize: 12, marginBottom: 14, color: '#888', textTransform: 'uppercase', letterSpacing: 1 }}>Screenshots</div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(170px, 1fr))', gap: 12 }}>
                {SCREENSHOTS.map(shot => (
                  <div key={shot.name} onClick={() => setActiveShot(shot.name)}
                    style={{ cursor: 'zoom-in', background: '#141414', border: '1px solid #1e1e1e', borderRadius: 12, overflow: 'hidden' }}>
                    <img src={`${RAW}/screenshots/${shot.name}.png`} alt={shot.label}
                      style={{ width: '100%', height: 170, objectFit: 'cover', objectPosition: 'top', display: 'block' }}
                      onError={e => { (e.target as HTMLImageElement).style.display = 'none' }} />
                    <div style={{ padding: '8px 12px', fontSize: 12, color: '#555' }}>{shot.label}</div>
                  </div>
                ))}
              </div>
            </div>
          </>
        )}

        {!loading && !meta && (
          <div style={{ textAlign: 'center', color: '#444', padding: 80 }}>
            <div style={{ fontSize: 48, marginBottom: 16 }}>⏳</div>
            <div style={{ fontSize: 16 }}>Nog geen testresultaten beschikbaar.</div>
            <div style={{ fontSize: 13, marginTop: 8, color: '#333' }}>Push naar main om de eerste run te starten.</div>
          </div>
        )}
      </div>

      {activeShot && (
        <div onClick={() => setActiveShot(null)}
          style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.92)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, cursor: 'zoom-out' }}>
          <img src={`${RAW}/screenshots/${activeShot}.png`} alt={activeShot}
            style={{ maxHeight: '90vh', maxWidth: '90vw', borderRadius: 12, boxShadow: '0 0 80px rgba(0,0,0,0.8)' }} />
        </div>
      )}
    </div>
  )
}
