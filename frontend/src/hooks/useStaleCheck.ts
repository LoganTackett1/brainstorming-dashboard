import { useEffect, useState } from "react";

// Generic hook for polling remote data and comparing with local state
export function useStaleCheck<T>(
  fetchFn: () => Promise<T>, // function to fetch fresh data
  currentData: T, // current local data
  deps: any[] = [], // dependencies (board id, token, etc.)
  intervalMs: number = 5000, // polling interval
) {
  const [stale, setStale] = useState(false);

  useEffect(
    () => {
      const interval = setInterval(async () => {
        try {
          const freshData = await fetchFn();
          if (JSON.stringify(freshData) !== JSON.stringify(currentData)) {
            setStale(true);
          }
        } catch (err) {
          console.error("Stale check failed:", err);
        }
      }, intervalMs);

      return () => clearInterval(interval);
      // eslint-disable-next-line react-hooks/exhaustive-deps
    },
    deps.concat([currentData]),
  ); // re-run when deps or currentData change

  return { stale, setStale };
}
