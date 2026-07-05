"use client";

import { useCallback, useEffect, useRef, useState } from "react";

export type SaveState = "idle" | "editing" | "saving" | "saved";

/** Debounced autosave. Call `schedule(content)` on every change. */
export function useAutosave(slug: string, initial: string) {
  const [state, setState] = useState<SaveState>("saved");
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const latest = useRef(initial);

  const save = useCallback(async (content: string) => {
    setState("saving");
    try {
      await fetch(`/api/proposals/${slug}/save`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content }),
      });
      setState("saved");
    } catch {
      setState("editing");
    }
  }, [slug]);

  const schedule = useCallback(
    (content: string) => {
      latest.current = content;
      setState("editing");
      if (timer.current) clearTimeout(timer.current);
      timer.current = setTimeout(() => save(content), 1400);
    },
    [save]
  );

  const saveNow = useCallback(() => {
    if (timer.current) clearTimeout(timer.current);
    return save(latest.current);
  }, [save]);

  useEffect(() => () => void (timer.current && clearTimeout(timer.current)), []);

  return { state, schedule, saveNow };
}
