import { useMemo, useState } from "react";
import { Pressable, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import {
  Button,
  Card,
  Input,
  ListItem,
  Screen,
  Sheet,
  Tabs,
  Text,
  useTheme,
} from "@finpilot/ui";
import { categorize } from "@finpilot/finance-engine";
import {
  useAddTransaction,
  useAllTransactions,
  useCategories,
  useDeleteTransaction,
} from "../../src/lib/hooks";
import { dateHeader, groupBy, money } from "../../src/lib/format";

export default function TransactionsScreen() {
  const { colors } = useTheme();
  const tx = useAllTransactions();
  const categories = useCategories();
  const del = useDeleteTransaction();
  const [open, setOpen] = useState(false);

  const grouped = useMemo(() => {
    const rows = tx.data ?? [];
    return Array.from(groupBy(rows, (r) => r.date.slice(0, 10)).entries());
  }, [tx.data]);

  const catName = (id: string | null) =>
    id ? (categories.data?.find((c) => c.id === id)?.name ?? "Other") : "Other";
  const catIcon = (id: string | null) =>
    id ? (categories.data?.find((c) => c.id === id)?.icon ?? "•") : "•";

  return (
    <Screen>
      <View className="mb-3 mt-2 flex-row items-center justify-between">
        <Text variant="h1">Activity</Text>
        <Button
          size="sm"
          label="Add"
          left={<Ionicons name="add" size={18} color={colors.primaryForeground} />}
          onPress={() => setOpen(true)}
        />
      </View>

      {grouped.length === 0 ? (
        <Card className="mt-6 items-center py-10">
          <Ionicons name="receipt-outline" size={40} color={colors.mutedForeground} />
          <Text variant="h3" className="mt-3">
            No transactions yet
          </Text>
          <Text tone="muted" variant="caption" className="mt-1 text-center">
            Add one manually, or scan a receipt from the dashboard.
          </Text>
          <Button label="Add transaction" className="mt-4" onPress={() => setOpen(true)} />
        </Card>
      ) : (
        grouped.map(([day, rows]) => (
          <View key={day} className="mb-2">
            <Text variant="label" tone="muted" className="mb-1 mt-3">
              {dateHeader(day)}
            </Text>
            <Card flush className="px-4">
              {rows.map((t, i) => (
                <Pressable
                  key={t.id}
                  onLongPress={() => void del.mutateAsync(t.id)}
                  className={i > 0 ? "border-t border-border" : ""}
                >
                  <ListItem
                    title={t.merchant || t.note || catName(t.categoryId)}
                    subtitle={`${catName(t.categoryId)}${t.source === "receipt" ? " • scanned" : ""}`}
                    left={<Text variant="h3">{catIcon(t.categoryId)}</Text>}
                    value={`${t.type === "income" ? "+" : "-"}${money(t.amount)}`}
                    valueTone={t.type === "income" ? "positive" : "default"}
                  />
                </Pressable>
              ))}
            </Card>
          </View>
        ))
      )}

      <AddTransactionSheet visible={open} onClose={() => setOpen(false)} />
    </Screen>
  );
}

/** Bottom-sheet form for adding a transaction (with category suggestion). */
function AddTransactionSheet({
  visible,
  onClose,
}: {
  visible: boolean;
  onClose: () => void;
}) {
  const categories = useCategories();
  const add = useAddTransaction();

  const [type, setType] = useState<"expense" | "income">("expense");
  const [amount, setAmount] = useState("");
  const [merchant, setMerchant] = useState("");
  const [note, setNote] = useState("");
  const [categoryId, setCategoryId] = useState<string | null>(null);

  // Live category suggestion from the merchant/note text.
  const suggestion = useMemo(() => {
    if (!merchant && !note) return null;
    return categorize({ merchant, description: note });
  }, [merchant, note]);

  const reset = () => {
    setType("expense");
    setAmount("");
    setMerchant("");
    setNote("");
    setCategoryId(null);
  };

  const onSave = async () => {
    const value = Number.parseFloat(amount.replace(/[^0-9.]/g, ""));
    if (!Number.isFinite(value) || value <= 0) return;
    const resolvedCat =
      categoryId ??
      (suggestion
        ? (categories.data?.find((c) => c.name === suggestion)?.id ?? null)
        : null);
    await add.mutateAsync({
      amount: value,
      type,
      categoryId: resolvedCat,
      merchant: merchant || undefined,
      note: note || undefined,
      date: new Date().toISOString().slice(0, 10),
    });
    reset();
    onClose();
  };

  return (
    <Sheet visible={visible} onClose={onClose} title="Add transaction">
      <View className="gap-3">
        <Tabs
          items={[
            { key: "expense", label: "Expense" },
            { key: "income", label: "Income" },
          ]}
          value={type}
          onChange={(k) => setType(k as "expense" | "income")}
        />
        <Input
          label="Amount"
          keyboardType="decimal-pad"
          placeholder="0.00"
          value={amount}
          onChangeText={setAmount}
          left={<Text tone="muted">$</Text>}
        />
        <Input
          label="Merchant"
          placeholder="e.g. Whole Foods"
          value={merchant}
          onChangeText={setMerchant}
        />
        <Input
          label="Note"
          placeholder="Optional"
          value={note}
          onChangeText={setNote}
        />

        <View>
          <Text variant="label" tone="muted" className="mb-1.5">
            Category {suggestion ? `· suggested: ${suggestion}` : ""}
          </Text>
          <View className="flex-row flex-wrap gap-2">
            {categories.data?.map((c) => {
              const selected =
                categoryId === c.id || (!categoryId && suggestion === c.name);
              return (
                <Pressable
                  key={c.id}
                  onPress={() => setCategoryId(c.id)}
                  className={
                    "flex-row items-center gap-1 rounded-full border px-3 py-1.5 " +
                    (selected ? "border-primary bg-primary/15" : "border-border")
                  }
                >
                  <Text variant="caption">{c.icon}</Text>
                  <Text variant="caption" className={selected ? "text-primary" : ""}>
                    {c.name}
                  </Text>
                </Pressable>
              );
            })}
          </View>
        </View>

        <Button
          label="Save transaction"
          className="mt-2"
          loading={add.isPending}
          onPress={() => void onSave()}
        />
      </View>
    </Sheet>
  );
}
