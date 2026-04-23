import { io, type Socket } from "socket.io-client";

let _socket: Socket | null = null;

export function getSocket(): Socket {
  if (!_socket) {
    // In Capacitor (native app) wordt NEXT_PUBLIC_API_URL gebruikt voor de absolute server-URL.
    // In de browser werkt een relatief pad via window.location.
    const serverUrl = process.env.NEXT_PUBLIC_API_URL;
    console.log("[socket] init — serverUrl:", serverUrl ?? "(relatief)", "| location:", typeof window !== "undefined" ? window.location.href : "SSR");
    _socket = io(serverUrl ?? "", {
      path: "/socket.io",
      transports: ["websocket", "polling"],
      autoConnect: true,
    });

    _socket.on("connect", () => {
      console.log("[socket] ✅ verbonden — id:", _socket?.id, "transport:", (_socket as any)?.io?.engine?.transport?.name);
    });
    _socket.on("connect_error", (err) => {
      console.error("[socket] ❌ connect_error:", err.message, err);
    });
    _socket.on("disconnect", (reason) => {
      console.warn("[socket] DISCONNECT reden:", reason);
    });
    _socket.on("reconnect_attempt", (n) => {
      console.log("[socket] reconnect poging #", n);
    });
    _socket.on("reconnect", (n) => {
      console.log("[socket] ✅ herverbonden na", n, "pogingen");
    });
    _socket.on("reconnect_failed", () => {
      console.error("[socket] ❌ reconnect definitief mislukt");
    });
  }
  return _socket;
}

export function disconnectSocket() {
  _socket?.disconnect();
  _socket = null;
}
