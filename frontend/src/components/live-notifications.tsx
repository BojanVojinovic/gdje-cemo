"use client";

import { useToast } from "@/components/ui";
import { useAuth } from "@/lib/auth";
import { useEffect, useRef } from "react";

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000/api";

type Notice = { id: number; title: string; body: string };

export function LiveNotifications() {
  const { token } = useAuth();
  const toast = useToast();
  const toastRef = useRef(toast);
  toastRef.current = toast;
  const after = useRef(0);
  const seen = useRef(new Set<number>());

  useEffect(() => {
    if (!token) return;
    const controller = new AbortController();
    let stopped = false;

    async function listen() {
      while (!stopped) {
        try {
          const response = await fetch(`${API_URL}/me/notifications/stream?after=${after.current}`, {
            headers: { Authorization: `Bearer ${token}`, Accept: "text/event-stream" },
            signal: controller.signal,
          });
          if (!response.ok || !response.body) {
            await wait(4000);
            continue;
          }
          const reader = response.body.getReader();
          const decoder = new TextDecoder();
          let buffer = "";
          while (!stopped) {
            const chunk = await reader.read();
            if (chunk.done) break;
            buffer += decoder.decode(chunk.value, { stream: true });
            const parts = buffer.split("\n\n");
            buffer = parts.pop() ?? "";
            for (const part of parts) {
              const line = part.split("\n").find((row) => row.startsWith("data: "));
              if (!line) continue;
              const item = JSON.parse(line.slice(6)) as Notice;
              if (!item?.id || seen.current.has(item.id)) continue;
              seen.current.add(item.id);
              after.current = Math.max(after.current, item.id);
              toastRef.current(item.title);
            }
          }
        } catch {
          if (stopped) return;
          await wait(4000);
        }
      }
    }

    void listen();
    return () => {
      stopped = true;
      controller.abort();
    };
  }, [token]);

  return null;
}

function wait(ms: number) {
  return new Promise((resolve) => window.setTimeout(resolve, ms));
}
