import { useState } from "react";
import { View } from "react-native";
import { router } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import {
  Button,
  Card,
  CardHeader,
  DonutChart,
  ListItem,
  Screen,
  Text,
  useTheme,
} from "@finpilot/ui";
import type { GeneratedInsights } from "@finpilot/ai-engine";
import {
  useFinanceContext,
  useMonthTotals,
  useSpendByCategory,
} from "../../src/lib/hooks";
import { getActiveProvider, ON_DEVICE_HELP_MESSAGE } from "../../src/lib/ai";
import { money, monthKey, monthLabel, moneyCompact } from "../../src/lib/format";

const SEVERITY_TONE = {
  info: "info",
  warning: "warning",
  critical: "danger",
} as const;

export default function ReportsScreen() {
  const { colors } = useTheme();
  const month = monthKey();
  const totals = useMonthTotals(month);
  const spend = useSpendByCategory(month);
  const ctx = useFinanceContext(month);

  const [narrative, setNarrative] = useState<GeneratedInsights | null>(null);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const savings = (totals.data?.net ?? 0);
  const savingsRate =
    totals.data && totals.data.income > 0
      ? Math.round((savings / totals.data.income) * 100)
      : 0;

  const donut = spend.data?.slice(0, 6).map((s) => ({ label: s.category, value: s.amount })) ?? [];
  const totalSpend = spend.data?.reduce((a, s) => a + s.amount, 0) ?? 0;

  const generate = async () => {
    setBusy(true);
    setErr(null);
    try {
      const provider = await getActiveProvider();
      const result = await provider.generateInsights(ctx.data ?? {});
      setNarrative(result);
    } catch (e) {
      setErr(e instanceof Error ? e.message : String(e));
    } finally {
      setBusy(false);
    }
  };

  return (
    <Screen>
      <View className="mb-3 mt-2">
        <Text variant="h1">Reports</Text>
        <Text tone="muted">{monthLabel(month)}</Text>
      </View>

      {/* Summary cards */}
      <View className="flex-row gap-3">
        <Card className="flex-1">
          <Text variant="caption" tone="muted">
            Income
          </Text>
          <Text variant="h2" tone="positive" className="mt-1 tabular-nums">
            {money(totals.data?.income ?? 0)}
          </Text>
        </Card>
        <Card className="flex-1">
          <Text variant="caption" tone="muted">
            Expenses
          </Text>
          <Text variant="h2" className="mt-1 tabular-nums">
            {money(totals.data?.expense ?? 0)}
          </Text>
        </Card>
      </View>
      <Card className="mt-3">
        <View className="flex-row items-center justify-between">
          <View>
            <Text variant="caption" tone="muted">
              Net saved
            </Text>
            <Text
              variant="h1"
              tone={savings >= 0 ? "positive" : "danger"}
              className="mt-1 tabular-nums"
            >
              {money(savings, { sign: true })}
            </Text>
          </View>
          <View className="items-end">
            <Text variant="caption" tone="muted">
              Savings rate
            </Text>
            <Text variant="h2" className="mt-1 tabular-nums">
              {savingsRate}%
            </Text>
          </View>
        </View>
      </Card>

      {/* Category breakdown */}
      <Card className="mt-3 items-center">
        <CardHeader title="Category breakdown" className="w-full" />
        <DonutChart
          data={donut}
          size={180}
          centerLabel={moneyCompact(totalSpend)}
          centerCaption="spent"
        />
        <View className="mt-3 w-full">
          {spend.data?.slice(0, 6).map((s) => (
            <ListItem
              key={s.category}
              title={s.category}
              subtitle={`${s.count} ${s.count === 1 ? "transaction" : "transactions"}`}
              value={money(s.amount)}
            />
          ))}
        </View>
      </Card>

      {/* AI narrative */}
      <Card className="mt-3">
        <CardHeader
          title="AI summary"
          subtitle="A plain-English read on this month"
          right={
            <Button
              size="sm"
              variant="secondary"
              label={narrative ? "Refresh" : "Generate"}
              loading={busy}
              onPress={() => void generate()}
            />
          }
        />
        {err ? (
          <Text tone="danger" variant="caption">
            {err}
            {"\n"}
            {ON_DEVICE_HELP_MESSAGE}
          </Text>
        ) : narrative ? (
          <View className="gap-3">
            {narrative.insights.map((ins, i) => (
              <View key={i} className="flex-row gap-2">
                <Ionicons
                  name="sparkles"
                  size={16}
                  color={colors[SEVERITY_TONE[ins.severity]]}
                  style={{ marginTop: 2 }}
                />
                <View className="flex-1">
                  <Text className="font-semibold">{ins.title}</Text>
                  {ins.detail ? (
                    <Text tone="muted" variant="caption" className="mt-0.5">
                      {ins.detail}
                    </Text>
                  ) : null}
                </View>
              </View>
            ))}
          </View>
        ) : (
          <Text tone="muted" variant="caption">
            Tap Generate for an AI-written summary of your month.
          </Text>
        )}
      </Card>

      {/* Quick links */}
      <View className="mt-3 flex-row gap-3">
        <Button
          variant="outline"
          label="Plan a budget"
          className="flex-1"
          onPress={() => router.push("/budget")}
        />
        <Button
          variant="outline"
          label="See insights"
          className="flex-1"
          onPress={() => router.push("/insights")}
        />
      </View>
    </Screen>
  );
}
