"use client";

import { useEffect, useRef, useState } from "react";
import { authFetch, parseJsonResponse } from "@/lib/auth-client";
import type { GeocodeResult } from "@/lib/geocode";
import { adminInput } from "./admin-ui";

type Props = {
  onSelect: (place: GeocodeResult) => void;
  disabled?: boolean;
};

export function LocationSearch({ onSelect, disabled }: Props) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<GeocodeResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [open, setOpen] = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const wrapRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);

    const trimmed = query.trim();
    if (trimmed.length < 2) {
      setResults([]);
      setLoading(false);
      setError(null);
      return;
    }

    setLoading(true);
    debounceRef.current = setTimeout(() => {
      void (async () => {
        try {
          const res = await authFetch(
            `/api/geocode/search?q=${encodeURIComponent(trimmed)}`,
          );
          const data = await parseJsonResponse<{
            results?: GeocodeResult[];
            error?: string;
          }>(res);
          if (!res.ok) {
            setError(data.error ?? "Search failed");
            setResults([]);
            return;
          }
          setError(null);
          setResults(data.results ?? []);
          setOpen(true);
        } catch {
          setError("Search failed. Check your connection.");
          setResults([]);
        } finally {
          setLoading(false);
        }
      })();
    }, 550);

    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [query]);

  useEffect(() => {
    function onDocClick(e: MouseEvent) {
      if (wrapRef.current && !wrapRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", onDocClick);
    return () => document.removeEventListener("mousedown", onDocClick);
  }, []);

  function pick(place: GeocodeResult) {
    onSelect(place);
    setQuery(place.shortName);
    setOpen(false);
    setResults([]);
  }

  return (
    <div ref={wrapRef} className="relative">
      <label className="ella-label block text-xs font-semibold uppercase tracking-wide text-[var(--ella-fg-subtle)]">
        Search location
      </label>
      <div className="relative mt-1.5">
        <span
          className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-[var(--ella-fg-subtle)]"
          aria-hidden
        >
          <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none">
            <path
              d="m21 21-5.2-5.2M11 18a7 7 0 1 0 0-14 7 7 0 0 0 0 14Z"
              stroke="currentColor"
              strokeWidth="1.75"
              strokeLinecap="round"
            />
          </svg>
        </span>
        <input
          type="search"
          disabled={disabled}
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onFocus={() => results.length > 0 && setOpen(true)}
          placeholder="Office address, city, landmark…"
          className={`${adminInput} pl-10 pr-10 shadow-sm disabled:bg-[var(--ella-surface-muted)]`}
          autoComplete="off"
        />
        {loading && (
          <span
            className="absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 animate-spin rounded-full border-2 border-[var(--ella-border)] border-t-[var(--ella-accent)]"
            aria-hidden
          />
        )}
      </div>

      {error && (
        <p className="ella-alert-error mt-1.5 text-xs" role="alert">
          {error}
        </p>
      )}

      {open && results.length > 0 && (
        <ul
          className="absolute z-50 mt-1 max-h-56 w-full overflow-auto rounded-lg border border-[var(--ella-border)] bg-[var(--ella-surface)] py-1 shadow-lg"
          role="listbox"
        >
          {results.map((place) => (
            <li key={`${place.latitude}-${place.longitude}-${place.displayName}`}>
              <button
                type="button"
                role="option"
                className="w-full px-3 py-2.5 text-left text-sm transition hover:bg-[var(--ella-accent-subtle)]"
                onClick={() => pick(place)}
              >
                <span className="font-medium text-[var(--ella-fg)]">
                  {place.shortName}
                </span>
                <span className="mt-0.5 block text-xs text-[var(--ella-fg-subtle)] line-clamp-2">
                  {place.displayName}
                </span>
              </button>
            </li>
          ))}
        </ul>
      )}

      {open && !loading && query.trim().length >= 2 && results.length === 0 && !error && (
        <p className="absolute z-50 mt-1 w-full rounded-lg border border-[var(--ella-border)] bg-[var(--ella-surface)] px-3 py-2 text-xs text-[var(--ella-fg-subtle)] shadow-lg">
          No places found. Try a city, street, or building name.
        </p>
      )}
    </div>
  );
}
