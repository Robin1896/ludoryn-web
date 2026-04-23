/**
 * Geeft de volledige URL terug voor een API-pad.
 * In de browser/webserver: relatief pad (bijv. "/api/auth/me").
 * In Capacitor (native app): absolute URL via NEXT_PUBLIC_API_URL.
 */
export function apiUrl(path: string): string {
  const base = process.env.NEXT_PUBLIC_API_URL ?? "";
  return `${base}${path}`;
}

/**
 * fetch-wrapper met automatische console-logging voor debugging.
 */
export async function apiFetch(path: string, init?: RequestInit): Promise<Response> {
  const url = apiUrl(path);
  console.log(`[api] ${init?.method ?? "GET"} ${url}`);
  try {
    const res = await fetch(url, init);
    if (!res.ok) {
      console.warn(`[api] ⚠️ ${init?.method ?? "GET"} ${url} → ${res.status} ${res.statusText}`);
    } else {
      console.log(`[api] ✅ ${init?.method ?? "GET"} ${url} → ${res.status}`);
    }
    return res;
  } catch (err) {
    console.error(`[api] ❌ ${init?.method ?? "GET"} ${url} — netwerk fout:`, err);
    throw err;
  }
}
