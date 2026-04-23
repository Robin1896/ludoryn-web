import { test, expect } from "@playwright/test";

test.describe("API routes", () => {
  test("GET /api/sessions geeft array terug", async ({ request }) => {
    const res = await request.get("/api/sessions");
    expect(res.status()).toBe(200);
    const data = await res.json();
    expect(Array.isArray(data)).toBe(true);
  });

  test("GET /api/leaderboard geeft array terug", async ({ request }) => {
    const res = await request.get("/api/leaderboard");
    expect(res.status()).toBe(200);
    const data = await res.json();
    expect(Array.isArray(data)).toBe(true);
  });

  test("GET /api/sessions?game=grub filtert op spel", async ({ request }) => {
    const res = await request.get("/api/sessions?game=grub");
    expect(res.status()).toBe(200);
    const data = await res.json();
    expect(Array.isArray(data)).toBe(true);
    for (const s of data) {
      expect(s.game_type).toBe("grub");
    }
  });

  test("GET /api/profile/[name] geeft profiel terug", async ({ request }) => {
    const res = await request.get("/api/profile/onbekend_xyz");
    expect(res.status()).toBe(200);
    const data = await res.json();
    expect(data).toHaveProperty("name");
    expect(data).toHaveProperty("games");
    expect(data).toHaveProperty("byType");
  });

  test("POST /api/auth/register valideert input", async ({ request }) => {
    const res = await request.post("/api/auth/register", {
      data: { username: "ab", password: "123" }, // te kort
    });
    expect(res.status()).toBe(400);
  });

  test("POST /api/auth/login met onbekende user geeft 401", async ({ request }) => {
    const res = await request.post("/api/auth/login", {
      data: { username: "bestaat_echt_niet_xyz", password: "fout" },
    });
    expect(res.status()).toBe(401);
  });

  test("GET /api/auth/me zonder cookie geeft geen user", async ({ request }) => {
    const res = await request.get("/api/auth/me");
    expect(res.status()).toBe(200);
    const data = await res.json();
    // Geen ingelogde user: null of object zonder username
    expect(data?.username ?? null).toBeNull();
  });

  test("register → login → me flow", async ({ request }) => {
    const username = `flow_${Date.now()}`;

    const reg = await request.post("/api/auth/register", {
      data: { username, password: "veiligww" },
    });
    expect([200, 201]).toContain(reg.status());

    const login = await request.post("/api/auth/login", {
      data: { username, password: "veiligww" },
    });
    expect(login.status()).toBe(200);

    // /me met cookie van login response
    const me = await request.get("/api/auth/me");
    expect(me.status()).toBe(200);
    const meData = await me.json();
    expect(meData.username).toBe(username);
  });

  test("GET /api/sessions bevat verwachte velden", async ({ request }) => {
    const res = await request.get("/api/sessions");
    const data = await res.json();
    if (data.length > 0) {
      const s = data[0];
      expect(s).toHaveProperty("room_id");
      expect(s).toHaveProperty("game_type");
      expect(s).toHaveProperty("status");
      expect(s).toHaveProperty("player1_name");
    }
  });

  test("GET /api/leaderboard bevat elo veld", async ({ request }) => {
    const res = await request.get("/api/leaderboard");
    const data = await res.json();
    if (data.length > 0) {
      expect(data[0]).toHaveProperty("elo");
      // Eerste entry heeft hoogste ELO (gesorteerd DESC)
      for (let i = 1; i < data.length; i++) {
        expect(data[i - 1].elo).toBeGreaterThanOrEqual(data[i].elo);
      }
    }
  });

  test("GET /api/replay/onbekende-room geeft lege response", async ({ request }) => {
    const res = await request.get("/api/replay/onbekende-room-xyz");
    expect(res.status()).toBe(200);
    const data = await res.json();
    expect(data.session).toBeNull();
    expect(Array.isArray(data.snapshots)).toBe(true);
  });

  test("POST /api/auth/register dubbele gebruikersnaam geeft fout", async ({ request }) => {
    const username = `dup_${Date.now().toString().slice(-7)}`;
    // Eerste registratie
    await request.post("/api/auth/register", { data: { username, password: "pass123" } });
    // Tweede poging met zelfde naam
    const res = await request.post("/api/auth/register", { data: { username, password: "anders" } });
    expect(res.status()).toBeGreaterThanOrEqual(400);
  });

  test("POST /api/auth/logout werkt", async ({ request }) => {
    const res = await request.post("/api/auth/logout");
    expect([200, 204]).toContain(res.status());
  });

  test("GET /api/profile bevat stats structuur", async ({ request }) => {
    const res = await request.get("/api/profile/onbekend_stats_xyz");
    const data = await res.json();
    expect(data).toHaveProperty("name", "onbekend_stats_xyz");
    expect(data).toHaveProperty("games");
    expect(data).toHaveProperty("byType");
    expect(Array.isArray(data.games)).toBe(true);
  });
});
