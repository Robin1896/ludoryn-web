import Link from "next/link";

export default function Nav() {
  return (
    <nav style={{
      position: "fixed",
      top: 0,
      left: 0,
      right: 0,
      zIndex: 50,
      display: "flex",
      alignItems: "center",
      gap: 6,
      padding: "10px 20px",
      background: "linear-gradient(to bottom, rgba(10,4,1,0.85) 0%, rgba(10,4,1,0) 100%)",
    }}>
      <Link href="/" style={{
        color: "#f5d580",
        fontWeight: 800,
        fontSize: 17,
        textDecoration: "none",
        letterSpacing: -0.3,
        textShadow: "0 2px 8px rgba(200,130,10,0.4)",
      }}>
        Catan 3D
      </Link>
      <span style={{ color: "rgba(255,255,255,0.2)", fontSize: 12 }}>·</span>
      <Link href="/catalog" style={{ color: "rgba(255,220,150,0.45)", fontWeight: 500, fontSize: 13, textDecoration: "none", transition: "color 0.15s" }}
        onMouseEnter={(e) => (e.currentTarget.style.color = "rgba(255,220,150,0.8)")}
        onMouseLeave={(e) => (e.currentTarget.style.color = "rgba(255,220,150,0.45)")}
      >
        Catalogus
      </Link>
      <span style={{ color: "rgba(255,255,255,0.2)", fontSize: 12 }}>·</span>
      <Link href="/scores" style={{ color: "rgba(255,220,150,0.45)", fontWeight: 500, fontSize: 13, textDecoration: "none", transition: "color 0.15s" }}
        onMouseEnter={(e) => (e.currentTarget.style.color = "rgba(255,220,150,0.8)")}
        onMouseLeave={(e) => (e.currentTarget.style.color = "rgba(255,220,150,0.45)")}
      >
        Scores
      </Link>
      <span style={{ color: "rgba(255,255,255,0.2)", fontSize: 12 }}>·</span>
      <Link href="/levels" style={{ color: "rgba(255,220,150,0.45)", fontWeight: 500, fontSize: 13, textDecoration: "none", transition: "color 0.15s" }}
        onMouseEnter={(e) => (e.currentTarget.style.color = "rgba(255,220,150,0.8)")}
        onMouseLeave={(e) => (e.currentTarget.style.color = "rgba(255,220,150,0.45)")}
      >
        Niveaus
      </Link>
      <span style={{ color: "rgba(255,255,255,0.2)", fontSize: 12 }}>·</span>
      <Link href="/lobby" style={{ color: "rgba(255,220,150,0.45)", fontWeight: 500, fontSize: 13, textDecoration: "none", transition: "color 0.15s" }}
        onMouseEnter={(e) => (e.currentTarget.style.color = "rgba(255,220,150,0.8)")}
        onMouseLeave={(e) => (e.currentTarget.style.color = "rgba(255,220,150,0.45)")}
      >
        Lobby
      </Link>
      <span style={{ color: "rgba(255,255,255,0.2)", fontSize: 12 }}>·</span>
      <Link href="/components" style={{ color: "rgba(255,220,150,0.45)", fontWeight: 500, fontSize: 13, textDecoration: "none", transition: "color 0.15s" }}
        onMouseEnter={(e) => (e.currentTarget.style.color = "rgba(255,220,150,0.8)")}
        onMouseLeave={(e) => (e.currentTarget.style.color = "rgba(255,220,150,0.45)")}
      >
        Components
      </Link>
    </nav>
  );
}
