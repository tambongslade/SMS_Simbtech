'use client';

import { useEffect, useState } from 'react';
import apiService from './apiService';

// Whether the "Ask (AI)" assistant is usable on this server.
//
// The menu used to show "Ask (AI)" unconditionally, and on servers without
// AI_DATABASE_URL every question answered "The assistant is not configured".
// GET /ai/status reports { configured, modelAvailable, model }; the menu entry
// is hidden unless `configured` is true. The result is cached per page load.

export const AI_ASSISTANT_HREF_SUFFIX = '/ask';

let cached: boolean | null = null;
let inflight: Promise<boolean> | null = null;

function fetchAvailable(): Promise<boolean> {
  if (cached !== null) return Promise.resolve(cached);
  if (!inflight) {
    inflight = apiService
      .get<{ data?: { configured?: boolean } }>('/ai/status', { silent: true })
      .then((r) => !!r?.data?.configured)
      .catch(() => false)
      .then((ok) => {
        cached = ok;
        inflight = null;
        return ok;
      });
  }
  return inflight;
}

/**
 * false until the status is known (so the entry never flashes in and then
 * disappears), true only when the server says the assistant is configured.
 * Pass enabled=false for roles that never see the entry, to skip the request.
 */
export function useAiAssistantAvailable(enabled = true): boolean {
  const [available, setAvailable] = useState<boolean>(cached ?? false);
  useEffect(() => {
    if (!enabled) return;
    let alive = true;
    fetchAvailable().then((ok) => {
      if (alive) setAvailable(ok);
    });
    return () => {
      alive = false;
    };
  }, [enabled]);
  return available;
}

export const isAiAssistantHref = (href: string) => href.endsWith(AI_ASSISTANT_HREF_SUFFIX);
