"use client";

import PusherJS from "pusher-js";

let _pusher: PusherJS | null = null;

export function getPusher(): PusherJS {
  if (!_pusher) {
    _pusher = new PusherJS(process.env.NEXT_PUBLIC_PUSHER_KEY!, {
      cluster: process.env.NEXT_PUBLIC_PUSHER_CLUSTER!,
    });
  }
  return _pusher;
}
