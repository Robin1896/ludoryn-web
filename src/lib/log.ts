export async function logApi(opts: {
  method: string; path: string; status: number; durationMs: number
  userId?: string | null; error?: string | null
}) {
  const key = process.env.ADMIN_KEY
  if (!key) return
  fetch('https://admin-robin.vercel.app/api/log', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ key, app: 'ludoryn', ...opts }),
  }).catch(() => {})
}
