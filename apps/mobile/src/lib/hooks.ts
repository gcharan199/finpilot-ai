/**
 * TanStack Query hooks over the finance data layer + transaction repo. Screens
 * consume these; writes invalidate the `finance` / `transactions` keys.
 */
import { useMutation, useQuery } from "@tanstack/react-query";
import {
  categoriesRepo,
  transactionsRepo,
  type CategoryRow,
  type NewTransactionRow,
  type TransactionRow,
} from "@finpilot/database";
import { getDb, DEFAULT_ACCOUNT_ID } from "../db";
import {
  buildFinanceContext,
  healthForMonth,
  insightsForMonth,
  monthTotals,
  monthlyTrend,
  spendByCategory,
} from "./finance";
import { monthKey } from "./format";
import { invalidateFinance, queryClient } from "./queryClient";

export function useHealthScore(month = monthKey()) {
  return useQuery({
    queryKey: ["finance", "health", month],
    queryFn: () => healthForMonth(month),
  });
}

export function useSpendByCategory(month = monthKey()) {
  return useQuery({
    queryKey: ["finance", "spend", month],
    queryFn: () => spendByCategory(month),
  });
}

export function useMonthTotals(month = monthKey()) {
  return useQuery({
    queryKey: ["finance", "totals", month],
    queryFn: () => monthTotals(month),
  });
}

export function useMonthlyTrend(n = 6) {
  return useQuery({
    queryKey: ["finance", "trend", n],
    queryFn: () => monthlyTrend(n),
  });
}

export function useInsights(month = monthKey()) {
  return useQuery({
    queryKey: ["finance", "insights", month],
    queryFn: () => insightsForMonth(month),
  });
}

export function useFinanceContext(month = monthKey()) {
  return useQuery({
    queryKey: ["finance", "context", month],
    queryFn: () => buildFinanceContext(month),
  });
}

export function useCategories() {
  return useQuery<CategoryRow[]>({
    queryKey: ["categories"],
    queryFn: () => categoriesRepo.list(getDb()),
    staleTime: Infinity,
  });
}

export function useRecentTransactions(limit = 20) {
  return useQuery<TransactionRow[]>({
    queryKey: ["transactions", "recent", limit],
    queryFn: () => transactionsRepo.list(getDb(), { limit }),
  });
}

export function useAllTransactions() {
  return useQuery<TransactionRow[]>({
    queryKey: ["transactions", "all"],
    queryFn: () => transactionsRepo.list(getDb()),
  });
}

export interface AddTransactionInput {
  amount: number;
  type: "income" | "expense";
  categoryId: string | null;
  merchant?: string;
  note?: string;
  date: string;
  source?: "manual" | "receipt";
}

export function useAddTransaction() {
  return useMutation({
    mutationFn: async (input: AddTransactionInput) => {
      const db = getDb();
      const row: NewTransactionRow = {
        id: `txn_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
        accountId: DEFAULT_ACCOUNT_ID,
        categoryId: input.categoryId,
        amount: input.amount,
        type: input.type,
        merchant: input.merchant ?? null,
        note: input.note ?? null,
        date: input.date,
        source: input.source ?? "manual",
      };
      return transactionsRepo.create(db, row);
    },
    onSuccess: invalidateFinance,
  });
}

export function useDeleteTransaction() {
  return useMutation({
    mutationFn: async (id: string) => transactionsRepo.remove(getDb(), id),
    onSuccess: invalidateFinance,
  });
}

/** Force a refetch of everything (pull-to-refresh). */
export function refetchAll(): void {
  queryClient.invalidateQueries();
}
