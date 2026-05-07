import Pusher from "pusher";

export const pusher = new Pusher({
  appId:   process.env.PUSHER_APP_ID!,
  key:     process.env.NEXT_PUBLIC_PUSHER_KEY!,
  secret:  process.env.PUSHER_SECRET!,
  cluster: process.env.NEXT_PUBLIC_PUSHER_CLUSTER!,
  useTLS:  true,
});

export const triggerRoom   = (roomId: string, event: string, data: unknown) => pusher.trigger(`room-${roomId}`, event, data);
export const triggerLobby  = (data: unknown) => pusher.trigger("lobby", "lobby-update", data);
export const triggerGlobal = (channel: string, event: string, data: unknown) => pusher.trigger(channel, event, data);
