import { View } from "react-native";
import { router } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import {
  BarChart,
  Badge,
  Button,
  Card,
  CardHeader,
  DonutChart,
  ListItem,
  ProgressRing,
  Screen,
  Text,
  useTheme,
} from "@finpilot/ui";
import type { HealthBand } from "@finpilot/finance-engine";
import {
  useCategories,
  useHealthScore,
  useMonthlyTrend,
  useRecentTransactions,
  useSpendByCategory,
} from "../../src/lib/hooks";
import { dateHeader, money, moneyCompact, shortMonth } from "../../src/lib/format";

const BAND_TONE: Record<HealthBand, "danger" | "warning" | "info" | "positive"> = {
  Poor: "danger",
  Fair: "warning",
  Good: "info",
  Excellent: "positive",
};

export default function Dashboard() {
  const { colors } = useTheme();
  const health = useHealthScore();
  const spend = useSpendByCategory();
  const trend = useMonthlyTrend(6);
  const recent = useRecentTransactions(6);
  const categories = useCategories();

  const iconFor = (catName: string | undefined) =>
    categories.data?.find((c) => c.name === catName)?.icon ?? "•";

  const donutData =
    spend.data?.slice(0, 6).map((s) => ({ label: s.category, value: s.amount })) ?? [];
  const totalSpend = spend.data?.reduce((a, s) => a + s.amount, 0) ?? 0;

  const barData =
    trend.data?.map((t) => ({ x: shortMonth(t.month), y: Math.round(t.expense) })) ?? [];

  return (
    <Screen>
      <View className="mb-4 mt-2 flex-row items-end justify-between">
        <View>
          <Text tone="muted" variant="label">
            Welcome back
          </Text>
          <Text variant="h1">Your money</Text>
        </View>
        <Button
          size="sm"
          variant="secondary"
          label="Scan"
          left={<Ionicons name="scan" size={16} color={colors.foreground} />}
          onPress={() => router.push("/scanner")}
        />
      </View>

      {/* Health score hero */}
      <Card className="items-center">
        <CardHeader
          title="Financial health"
          subtitle="This month, weighted across savings, spend, buffer & debt"
          className="w-full"
        />
        <ProgressRing
          value={health.data?.overall ?? 0}
          caption={health.data?.band ?? "—"}
        />
        {health.data ? (
          <Badge
            className="mt-3"
            variant={BAND_TONE[health.data.band]}
            label={`${health.data.band} • ${health.data.overall}/100`}
          />
        ) : null}
        {health.data?.reasons?.length ? (
          <View className="mt-4 w-full gap-2">
            {health.data.reasons.slice(0, 3).map((r, i) => (
              <View key={i} className="flex-row items-start gap-2">
                <Ionicons
                  name="ellipse"
                  size={6}
                  color={colors.primary}
                  style={{ marginTop: 7 }}
                />
                <Text variant="caption" tone="muted" className="flex-1">
                  {r}
                </Text>
              </View>
            ))}
          </View>
        ) : null}
      </Card>

      {/* Spend by category */}
      <Card className="mt-4">
        <CardHeader title="Where it went" subtitle="Spending by category this month" />
        <View className="flex-row items-center">
          <DonutChart
            data={donutData}
            size={150}
            centerLabel={moneyCompact(totalSpend)}
            centerCaption="spent"
          />
          <View className="flex-1 gap-2 pl-2">
            {donutData.length === 0 ? (
              <Text tone="muted" variant="caption">
                Add transactions to see a breakdown.
              </Text>
            ) : (
              spend.data?.slice(0, 5).map((s, i) => (
                <View key={s.category} className="flex-row items-center justify-between">
                  <View className="flex-row items-center gap-2">
                    <View
                      className="h-2.5 w-2.5 rounded-full"
                      style={{ backgroundColor: CHART_DOTS[i % CHART_DOTS.length] }}
                    />
                    <Text variant="caption">{s.category}</Text>
                  </View>
                  <Text variant="caption" tone="muted" className="tabular-nums">
                    {money(s.amount)}
                  </Text>
                </View>
              ))
            )}
          </View>
        </View>
      </Card>

      {/* Trend */}
      <Card className="mt-4">
        <CardHeader title="Monthly spend" subtitle="Last 6 months" />
        <BarChart data={barData} height={170} />
      </Card>

      {/* Recent */}
      <Card className="mt-4" flush>
        <View className="px-4 pt-4">
          <CardHeader
            title="Recent activity"
            right={
              <Button
                size="sm"
                variant="ghost"
                label="See all"
                onPress={() => router.push("/(tabs)/transactions")}
              />
            }
          />
        </View>
        <View className="px-4 pb-1">
          {recent.data?.length ? (
            recent.data.map((t) => (
              <ListItem
                key={t.id}
                title={t.merchant || t.note || "Transaction"}
                subtitle={dateHeader(t.date)}
                left={<Text variant="h3">{iconFor(categoryName(categories.data, t.categoryId))}</Text>}
                value={`${t.type === "income" ? "+" : "-"}${money(t.amount)}`}
                valueTone={t.type === "income" ? "positive" : "default"}
              />
            ))
          ) : (
            <Text tone="muted" variant="caption" className="py-4">
              No transactions yet. Tap “Activity” to add one.
            </Text>
          )}
        </View>
      </Card>
    </Screen>
  );
}

const CHART_DOTS = ["#10b981", "#0ea5e9", "#8b5cf6", "#f59e0b", "#f43f5e", "#047857"];

function categoryName(
  cats: { id: string; name: string }[] | undefined,
  id: string | null,
): string | undefined {
  if (!id) return "Other";
  return cats?.find((c) => c.id === id)?.name;
}
