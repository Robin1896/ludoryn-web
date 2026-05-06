'use client'
import { useState, useEffect, useRef } from 'react'
import { Button, Skeleton } from '@/components/ui'

const REPO = 'Robin1896/ludoryn-web'
const BRANCH = 'test-results'
const RAW = `https://raw.githubusercontent.com/${REPO}/${BRANCH}`
const PASSWORD = 'ludoryn2026'

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
interface TestSpec { title: string; ok: boolean; tests: { status: string; duration: number; error?: { message: string } }[] }
interface TestSuite { title: string; suites?: TestSuite[]; specs?: TestSpec[] }
interface Report { suites?: TestSuite[]; stats?: { expected: number; unexpected: number; duration: number } }
interface FlatSpec { file: string; title: string; ok: boolean; duration: number; error?: string }

function flattenSpecs(suite: TestSuite, file = ''): FlatSpec[] {
  const results: FlatSpec[] = []
  const walk = (s: TestSuite, f: string) => {
    s.specs?.forEach(spec => results.push({
      file: f,
      title: spec.title,
      ok: spec.ok,
      duration: spec.tests?.[0]?.duration ?? 0,
      error: spec.tests?.find(t => t.error)?.error?.message,
    }))
    s.suites?.forEach(sub => walk(sub, f || s.title))
  }
  walk(suite, file || suite.title)
  return results
}

// ── Screenshot Slider ──────────────────────────────────────────────────────────
function ScreenshotSlider({ onOpen }: { onOpen: (name: string) => void }) {
  const [idx, setIdx] = useState(0)
  const trackRef = useRef<HTMLDivElement>(null)
  const startX = useRef(0)

  const prev = () => setIdx(i => (i - 1 + SCREENSHOTS.length) % SCREENSHOTS.length)
  const next = () => setIdx(i => (i + 1) % SCREENSHOTS.length)

  const onTouchStart = (e: React.TouchEvent) => { startX.current = e.touches[0].clientX }
  const onTouchEnd = (e: React.TouchEvent) => {
    const diff = startX.current - e.changedTouches[0].clientX
    if (Math.abs(diff) > 40) diff > 0 ? next() : prev()
  }

  const shot = SCREENSHOTS[idx]

  return (
    <div>
      <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: 2, color: 'var(--muted)', textTransform: 'uppercase', marginBottom: 14 }}>Screenshots</div>

      <div style={{ position: 'relative', background: 'var(--card)', border: '1px solid var(--border)', borderRadius: 14, overflow: 'hidden' }}
        onTouchStart={onTouchStart} onTouchEnd={onTouchEnd}>

        <div onClick={() => onOpen(shot.name)} style={{ cursor: 'zoom-in', position: 'relative' }}>
          <img
            key={shot.name}
            src={`${RAW}/screenshots/${shot.name}.png`}
            alt={shot.label}
            style={{ width: '100%', height: 320, objectFit: 'cover', objectPosition: 'top', display: 'block' }}
          />
          <div style={{
            position: 'absolute', bottom: 0, left: 0, right: 0,
            background: 'linear-gradient(transparent, rgba(26,21,20,0.7))',
            padding: '32px 16px 14px', display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          }}>
            <span style={{ color: '#fff', fontWeight: 700, fontSize: 14 }}>{shot.label}</span>
            <span style={{ color: 'rgba(255,255,255,0.6)', fontSize: 12 }}>{idx + 1} / {SCREENSHOTS.length}</span>
          </div>
        </div>

        <button onClick={prev} style={{
          position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)',
          background: 'rgba(255,255,255,0.85)', border: 'none', borderRadius: '50%',
          width: 34, height: 34, cursor: 'pointer', fontSize: 18, fontWeight: 700,
          display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text)',
        }}>‹</button>
        <button onClick={next} style={{
          position: 'absolute', right: 10, top: '50%', transform: 'translateY(-50%)',
          background: 'rgba(255,255,255,0.85)', border: 'none', borderRadius: '50%',
          width: 34, height: 34, cursor: 'pointer', fontSize: 18, fontWeight: 700,
          display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text)',
        }}>›</button>
      </div>

      {/* Dot indicators */}
      <div style={{ display: 'flex', justifyContent: 'center', gap: 6, marginTop: 12 }}>
        {SCREENSHOTS.map((s, i) => (
          <button key={i} onClick={() => setIdx(i)} style={{
            width: i === idx ? 20 : 7, height: 7, borderRadius: 4,
            background: i === idx ? 'var(--accent)' : 'var(--border)',
            border: 'none', cursor: 'pointer', padding: 0, transition: 'all 0.2s',
          }} />
        ))}
      </div>

      {/* Thumbnail strip */}
      <div ref={trackRef} style={{ display: 'flex', gap: 8, marginTop: 12, overflowX: 'auto', scrollbarWidth: 'none', paddingBottom: 2 }}>
        {SCREENSHOTS.map((s, i) => (
          <div key={s.name} onClick={() => setIdx(i)} style={{
            flexShrink: 0, width: 72, cursor: 'pointer',
            border: `2px solid ${i === idx ? 'var(--accent)' : 'var(--border)'}`,
            borderRadius: 8, overflow: 'hidden', transition: 'border-color 0.15s',
          }}>
            <img src={`${RAW}/screenshots/${s.name}.png`} alt={s.label}
              style={{ width: '100%', height: 48, objectFit: 'cover', objectPosition: 'top', display: 'block' }}
              onError={e => { (e.target as HTMLImageElement).style.opacity = '0.3' }} />
          </div>
        ))}
      </div>
    </div>
  )
}

// ── Main Page ──────────────────────────────────────────────────────────────────
export default function TestPage() {
  const [auth, setAuth] = useState(false)
  const [pw, setPw] = useState('')
  const [error, setError] = useState('')
  const [meta, setMeta] = useState<Meta | null>(null)
  const [report, setReport] = useState<Report | null>(null)
  const [loading, setLoading] = useState(false)
  const [activeShot, setActiveShot] = useState<string | null>(null)
  const [expandedFile, setExpandedFile] = useState<string | null>(null)

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
    } else { setError('Verkeerd wachtwoord') }
  }

  if (!auth) return (
    <div style={{ height: '100dvh', background: 'var(--bg)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <div style={{ background: 'var(--card)', border: '1px solid var(--border)', borderRadius: 20, padding: 40, width: 340, boxShadow: '0 2px 20px rgba(0,0,0,0.06)' }}>
        <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: 3, color: 'var(--muted)', textTransform: 'uppercase', marginBottom: 6, fontFamily: 'var(--font-body)' }}>Ludoryn</div>
        <div style={{ fontSize: 28, fontWeight: 700, color: 'var(--text)', marginBottom: 28, fontFamily: 'var(--font-display)' }}>Test Dashboard</div>
        <input type="password" value={pw} onChange={e => setPw(e.target.value)} onKeyDown={e => e.key === 'Enter' && login()}
          placeholder="Wachtwoord..." autoFocus
          style={{ width: '100%', boxSizing: 'border-box', background: 'var(--bg)', border: '1px solid var(--border)', borderRadius: 10, padding: '12px 14px', color: 'var(--text)', fontSize: 15, outline: 'none', marginBottom: 12, fontFamily: 'var(--font-body)' }} />
        {error && <div style={{ color: 'var(--red)', fontSize: 13, marginBottom: 10 }}>{error}</div>}
        <Button onClick={login} fullWidth size="lg">Inloggen</Button>
      </div>
    </div>
  )

  const allSpecs = report?.suites?.flatMap(s => flattenSpecs(s)) ?? []
  const passed = allSpecs.filter(s => s.ok).length
  const failed = allSpecs.filter(s => !s.ok).length
  const total = allSpecs.length
  const pct = total > 0 ? Math.round(passed / total * 100) : 0

  const byFile: Record<string, FlatSpec[]> = {}
  allSpecs.forEach(s => {
    const key = s.file.replace(/.*\//, '').replace('.spec.ts', '')
    if (!byFile[key]) byFile[key] = []
    byFile[key].push(s)
  })

  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg)', color: 'var(--text)', fontFamily: 'var(--font-body)', padding: '32px 16px' }}>
      <div style={{ maxWidth: 900, margin: '0 auto' }}>

        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 36 }}>
          <div>
            <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: 3, color: 'var(--muted)', textTransform: 'uppercase', marginBottom: 4 }}>Ludoryn · Test Dashboard</div>
            <div style={{ fontSize: 28, fontWeight: 700, color: 'var(--text)', fontFamily: 'var(--font-display)' }}>Playwright Rapporten</div>
          </div>
          <Button variant="secondary" size="sm" onClick={() => { document.cookie = 'test_auth=; max-age=0'; setAuth(false) }}>
            Uitloggen
          </Button>
        </div>

        {loading && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            <Skeleton height={80} radius={14} />
            <Skeleton height={80} radius={14} />
            <Skeleton height={80} radius={14} />
          </div>
        )}

        {!loading && meta && (
          <>
            {/* Stats */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))', gap: 10, marginBottom: 20 }}>
              {[
                { label: 'Run', value: `#${meta.run}`, color: 'var(--text)' },
                { label: 'Geslaagd', value: String(passed), color: 'var(--green)' },
                { label: 'Gefaald', value: String(failed), color: failed > 0 ? 'var(--red)' : 'var(--muted)' },
                { label: 'Score', value: total > 0 ? `${pct}%` : '—', color: pct === 100 ? 'var(--green)' : pct > 80 ? 'var(--amber)' : 'var(--red)' },
                { label: 'Datum', value: new Date(meta.timestamp).toLocaleString('nl-NL', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' }), color: 'var(--muted)' },
              ].map(stat => (
                <div key={stat.label} style={{ background: 'var(--card)', border: '1px solid var(--border)', borderRadius: 14, padding: '14px 18px' }}>
                  <div style={{ color: 'var(--muted)', fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: 1.5, marginBottom: 6 }}>{stat.label}</div>
                  <div style={{ fontSize: 22, fontWeight: 800, color: stat.color, fontFamily: 'var(--font-display)' }}>{stat.value}</div>
                </div>
              ))}
            </div>

            {/* Progress bar */}
            {total > 0 && (
              <div style={{ background: 'var(--border)', borderRadius: 8, height: 5, marginBottom: 36, overflow: 'hidden' }}>
                <div style={{ height: '100%', width: `${pct}%`, background: pct === 100 ? 'var(--green)' : 'var(--accent)', borderRadius: 8, transition: 'width 0.6s ease' }} />
              </div>
            )}

            {/* Mislukte tests */}
            {failed > 0 && (
              <div style={{ background: '#fef2f0', border: '1px solid #f5c6be', borderRadius: 14, padding: '16px 20px', marginBottom: 24 }}>
                <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--red)', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 10 }}>
                  ❌ {failed} test{failed > 1 ? 's' : ''} mislukt
                </div>
                {allSpecs.filter(s => !s.ok).map((spec, i) => (
                  <div key={i} style={{ marginBottom: 12, paddingBottom: 12, borderBottom: i < failed - 1 ? '1px solid #f5c6be' : 'none' }}>
                    <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--red)', marginBottom: 4 }}>
                      {spec.file.replace(/.*\//, '').replace('.spec.ts', '')} › {spec.title}
                    </div>
                    {spec.error && (
                      <pre style={{ fontSize: 11, color: '#7a3018', background: '#fde8e3', borderRadius: 6, padding: '8px 10px', margin: 0, overflowX: 'auto', whiteSpace: 'pre-wrap', wordBreak: 'break-word', fontFamily: 'var(--font-mono)', lineHeight: 1.5 }}>
                        {spec.error.slice(0, 400)}{spec.error.length > 400 ? '…' : ''}
                      </pre>
                    )}
                  </div>
                ))}
              </div>
            )}

            {/* Test resultaten per bestand */}
            <div style={{ marginBottom: 48 }}>
              <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: 2, color: 'var(--muted)', textTransform: 'uppercase', marginBottom: 14 }}>Test resultaten</div>
              {total === 0 ? (
                <div style={{ background: 'var(--card)', border: '1px solid var(--border)', borderRadius: 14, padding: 32, textAlign: 'center', color: 'var(--muted)', fontSize: 14 }}>
                  Geen testdata in rapport — controleer de CI logs.
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                  {Object.entries(byFile).map(([file, specs]) => {
                    const fileFailed = specs.filter(s => !s.ok).length
                    const isExpanded = expandedFile === file
                    return (
                      <div key={file} style={{ background: 'var(--card)', border: `1px solid ${fileFailed > 0 ? '#f5c6be' : 'var(--border)'}`, borderRadius: 14, overflow: 'hidden' }}>
                        <div onClick={() => setExpandedFile(isExpanded ? null : file)}
                          style={{ display: 'flex', alignItems: 'center', padding: '12px 16px', cursor: 'pointer', borderBottom: isExpanded ? '1px solid var(--border)' : 'none' }}>
                          <span style={{ fontSize: 12, fontWeight: 700, color: 'var(--muted)', flex: 1, letterSpacing: 0.5 }}>{file}</span>
                          <span style={{ fontSize: 11, color: 'var(--green)', fontWeight: 700, marginRight: 10 }}>✓ {specs.filter(s => s.ok).length}</span>
                          {fileFailed > 0 && <span style={{ fontSize: 11, color: 'var(--red)', fontWeight: 700, marginRight: 10 }}>✗ {fileFailed}</span>}
                          <span style={{ fontSize: 11, color: 'var(--muted)' }}>{isExpanded ? '▲' : '▼'}</span>
                        </div>
                        {(isExpanded || fileFailed > 0) && specs.map((spec, i) => (
                          <div key={i} style={{ borderTop: '1px solid var(--bg)' }}>
                            <div style={{ display: 'flex', alignItems: 'flex-start', padding: '10px 16px', gap: 10 }}>
                              <span style={{ fontSize: 14, flexShrink: 0, marginTop: 1 }}>{spec.ok ? '✅' : '❌'}</span>
                              <div style={{ flex: 1, minWidth: 0 }}>
                                <div style={{ fontSize: 13, color: spec.ok ? 'var(--text)' : 'var(--red)', fontWeight: spec.ok ? 400 : 600 }}>{spec.title}</div>
                                {!spec.ok && spec.error && (
                                  <pre style={{ marginTop: 6, fontSize: 11, color: '#7a3018', background: '#fde8e3', borderRadius: 6, padding: '8px 10px', overflowX: 'auto', whiteSpace: 'pre-wrap', wordBreak: 'break-word', fontFamily: 'var(--font-mono)', lineHeight: 1.5 }}>
                                    {spec.error.slice(0, 500)}{spec.error.length > 500 ? '…' : ''}
                                  </pre>
                                )}
                              </div>
                              <span style={{ fontSize: 11, color: 'var(--dim)', flexShrink: 0 }}>{spec.duration}ms</span>
                            </div>
                          </div>
                        ))}
                      </div>
                    )
                  })}
                </div>
              )}
            </div>

            {/* Screenshot slider */}
            <ScreenshotSlider onOpen={setActiveShot} />
          </>
        )}

        {!loading && !meta && (
          <div style={{ textAlign: 'center', padding: 80 }}>
            <div style={{ fontSize: 48, marginBottom: 16 }}>⏳</div>
            <div style={{ fontSize: 18, color: 'var(--text)', fontFamily: 'var(--font-display)', marginBottom: 8 }}>Nog geen testresultaten.</div>
            <div style={{ fontSize: 13, color: 'var(--muted)' }}>Push naar main om de eerste run te starten.</div>
          </div>
        )}
      </div>

      {/* Lightbox */}
      {activeShot && (
        <div onClick={() => setActiveShot(null)}
          style={{ position: 'fixed', inset: 0, background: 'rgba(26,21,20,0.92)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, cursor: 'zoom-out' }}>
          <img src={`${RAW}/screenshots/${activeShot}.png`} alt={activeShot}
            style={{ maxHeight: '90vh', maxWidth: '90vw', borderRadius: 16, boxShadow: '0 0 60px rgba(0,0,0,0.5)' }} />
        </div>
      )}
    </div>
  )
}
