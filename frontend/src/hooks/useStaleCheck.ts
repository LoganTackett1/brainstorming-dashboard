import { useEffect, useState } from "react";

// Generic hook for polling remote data and comparing with local state
export function useStaleCheck<T>(
  fetchFn: () => Promise<T>,
  currentData: T,
  deps: any[] = [],
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
    },
    deps.concat([currentData]),
  );

  return { stale, setStale };
}
