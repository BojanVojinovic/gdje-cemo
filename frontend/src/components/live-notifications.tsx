"use client";

import { useToast } from "@/components/ui";
import { useAuth } from "@/lib/auth";
import Pusher from "pusher-js";
import { useEffect, useRef } from "react";

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000/api";
const PUSHER_KEY = process.env.NEXT_PUBLIC_PUSHER_KEY ?? "";
const PUSHER_CLUSTER = process.env.NEXT_PUBLIC_PUSHER_CLUSTER ?? "eu";

type Notice = { id: number; title: string };

export function LiveNotifications() {
  const { token, user } = useAuth();
  const toast = useToast();
  const toastRef = useRef(toast);
  toastRef.current = toast;
  const seen = useRef(new Set<number>());

  useEffect(() => {
    if (!token || !user || !PUSHER_KEY) return;

    const pusher = new Pusher(PUSHER_KEY, {
      cluster: PUSHER_CLUSTER,
      forceTLS: true,
      authEndpoint: `${API_URL}/broadcasting/auth`,
      auth: {
        headers: {
          Authorization: `Bearer ${token}`,
          Accept: "application/json",
        },
      },
    });
    const channel = pusher.subscribe(`private-user.${user.id}`);
    channel.bind("notification", (item: Notice) => {
      if (!item?.id || seen.current.has(item.id)) return;
      seen.current.add(item.id);
      toastRef.current(item.title);
    });

    return () => {
      channel.unbind_all();
      pusher.unsubscribe(`private-user.${user.id}`);
      pusher.disconnect();
    };
  }, [token, user?.id]);

  return null;
}
