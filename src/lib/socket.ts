"use client";

import { getPusher } from "./pusher-client";
import type { Channel } from "pusher-js";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type AnyFn = (...args: any[]) => void;

// Events that go to room-${roomId} channel
const ROOM_EVENTS = new Set([
  "room-update","all-ready","state-sync","state-update","tiles-init",
  "dice-result","roll-start","dice-staging","turn-deadline","turn-timeout",
  "turn-forfeit","player-disconnected","quickmatch-timeout","room-chat",
  "rematch-offer","rematch-declined",
]);

// Events that go to lobby channel
const LOBBY_EVENTS = new Set(["lobby-update"]);

// Events that need roomId auto-injected (they don't include it in client emit)
const AUTO_ROOM_EVENTS = new Set([
  "state-update","tiles-init","resign","dice-result","roll-start",
  "dice-staging","rematch-request","rematch-decline","game-over",
]);

class FakeSocket {
  private channels: Map<string, Channel> = new Map();
  private _roomId: string | null = null;
  private _playerIndex: number = -1;
  private _handlers: Map<string, Set<AnyFn>> = new Map();
  // Stub for socket.io.on/off/once used by some game pages
  readonly io = {
    engine: { transport: { name: "pusher" } },
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    on:   (_e: string, _h: AnyFn) => {},
    off:  (_e: string, _h?: AnyFn) => {},
    once: (_e: string, _h: AnyFn) => {},
  };

  private ch(name: string): Channel {
    if (!this.channels.has(name)) {
      const c = getPusher().subscribe(name);
      this.channels.set(name, c);
      this._handlers.forEach((handlers, event) => {
        if (this._channelForEvent(event) === name) {
          handlers.forEach(h => c.bind(event, h));
        }
      });
    }
    return this.channels.get(name)!;
  }

  private _channelForEvent(event: string): string | null {
    if (LOBBY_EVENTS.has(event) || event.startsWith("chat-")) return "lobby";
    if (ROOM_EVENTS.has(event) && this._roomId) return `room-${this._roomId}`;
    return null;
  }

  setRoom(roomId: string, playerIndex: number) {
    this._roomId = roomId;
    this._playerIndex = playerIndex;
    // subscribe to room channel and bind any already-registered handlers
    const ch = this.ch(`room-${roomId}`);
    this._handlers.forEach((handlers, event) => {
      if (ROOM_EVENTS.has(event)) handlers.forEach(h => ch.bind(event, h));
    });
  }

  on(event: string, handler: AnyFn) {
    if (!this._handlers.has(event)) this._handlers.set(event, new Set());
    this._handlers.get(event)!.add(handler);

    if (event === "connect") {
      // fire immediately — Pusher connects automatically
      setTimeout(() => handler(), 50);
      return;
    }

    // Always subscribe lobby channel
    this.ch("lobby");

    const chName = this._channelForEvent(event);
    if (chName) this.ch(chName).bind(event, handler);
  }

  once(event: string, handler: AnyFn) {
    const wrapped: AnyFn = (...args) => {
      handler(...args);
      this.off(event, wrapped);
    };
    this.on(event, wrapped);
  }

  off(event: string, handler?: AnyFn) {
    if (handler) {
      this._handlers.get(event)?.delete(handler);
      this.channels.forEach(ch => ch.unbind(event, handler));
    } else {
      this._handlers.delete(event);
      this.channels.forEach(ch => ch.unbind(event));
    }
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  emit(event: string, data?: unknown, callback?: (res: any) => void) {
    const body: Record<string, unknown> = { event };

    if (data && typeof data === "object") {
      Object.assign(body, data);
    } else if (data !== undefined) {
      body.data = data;
    }

    // Auto-inject roomId and playerIndex for events that need it
    if (AUTO_ROOM_EVENTS.has(event)) {
      if (this._roomId && !body.roomId) body.roomId = this._roomId;
      if (this._playerIndex >= 0 && body.playerIndex === undefined) body.playerIndex = this._playerIndex;
    }

    fetch("/api/socket", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    })
      .then(r => r.json())
      .then(res => {
        // Auto-subscribe to room channel if response contains roomId
        if (res?.roomId && typeof res.roomId === "string") {
          const idx = typeof res.playerIndex === "number" ? res.playerIndex : this._playerIndex;
          this.setRoom(res.roomId, idx);
        }
        callback?.(res);
      })
      .catch(err => callback?.({ ok: false, error: err.message }));
  }

  disconnect() {
    this.channels.forEach((_, name) => getPusher().unsubscribe(name));
    this.channels.clear();
    this._handlers.clear();
    this._roomId = null;
    this._playerIndex = -1;
  }

  get connected(): boolean {
    try { return getPusher().connection.state === "connected"; } catch { return false; }
  }

  get id(): string { return "pusher-socket"; }
}

let _socket: FakeSocket | null = null;

export function getSocket(): FakeSocket {
  if (!_socket) _socket = new FakeSocket();
  return _socket;
}

export function disconnectSocket() {
  _socket?.disconnect();
  _socket = null;
}
