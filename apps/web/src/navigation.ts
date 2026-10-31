import { useSyncExternalStore, type MouseEvent } from "react";

function subscribe(listener: () => void): () => void {
  window.addEventListener("hashchange", listener);
  return () => window.removeEventListener("hashchange", listener);
}
function snapshot(): string {
  return window.location.hash.startsWith("#/")
    ? window.location.hash.slice(1)
    : "/";
}

export function usePageRoute(): { path: string; params: URLSearchParams } {
  const value = useSyncExternalStore(subscribe, snapshot, () => "/");
  const [path, query = ""] = value.split("?");
  return { path, params: new URLSearchParams(query) };
}
export function navigatePage(path: string): void {
  window.location.hash = path;
}

/** Skip links move focus within the page without replacing its hash route. */
export function skipToContent(event: MouseEvent<HTMLAnchorElement>): void {
  event.preventDefault();
  const target = document.getElementById(event.currentTarget.hash.slice(1));
  target?.focus();
  target?.scrollIntoView?.({ block: "start" });
}
