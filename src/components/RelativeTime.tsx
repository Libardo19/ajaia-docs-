"use client";

import { useEffect, useState } from "react";

function format(iso: string): string {
  const diff = (Date.now() - new Date(iso).getTime()) / 1000;
  if (diff < 45) return "just now";
  if (diff < 3600) return `${Math.round(diff / 60)} min ago`;
  if (diff < 86400) return `${Math.round(diff / 3600)} h ago`;
  return new Date(iso).toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" });
}

/** Renders on the client only to avoid server/client clock hydration mismatches. */
export function RelativeTime({ iso }: { iso: string }) {
  const [text, setText] = useState("");
  useEffect(() => {
    setText(format(iso));
    const t = setInterval(() => setText(format(iso)), 30_000);
    return () => clearInterval(t);
  }, [iso]);
  return <time dateTime={iso}>{text}</time>;
}
