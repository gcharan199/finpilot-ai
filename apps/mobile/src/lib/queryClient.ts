import { QueryClient } from "@tanstack/react-query";

/**
 * Single app-wide query client. Local SQLite reads are cheap, so a short stale
 * time + refetch-on-mount keeps the UI fresh after writes without aggressive
 * network-style retries.
 */
export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 30,
      retry: 1,
      refetchOnWindowFocus: false,
    },
  },
});

/** Invalidate every finance-derived query (call after any DB write). */
export function invalidateFinance(): void {
  queryClient.invalidateQueries({ queryKey: ["finance"] });
  queryClient.invalidateQueries({ queryKey: ["transactions"] });
}
