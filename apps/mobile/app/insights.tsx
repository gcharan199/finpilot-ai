import { useState } from "react";
import { View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import {
  Badge,
  Button,
  Card,
  CardHeader,
  ListItem,
  Screen,
  Text,
  useTheme,
} from "@finpilot/ui";
import type { GeneratedInsights } from "@finpilot/ai-engine";
import { useFinanceContext, useInsights } from "../src/lib/hooks";
import { getActiveProvider, ON_DEVICE_HELP_MESSAGE } from "../src/lib/ai";
import { money, monthKey } from "../src/lib/format";

export default function InsightsScreen() {
  const { colors } = useTheme();
  const month = monthKey();
  const insights = useInsights(month);
  const ctx = useFinanceContext(month);

  const [ai, setAi] = useState<GeneratedInsights | null>(null);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const report = insights.data;
  const totalChange = report?.totalPercentChange;

  const explain = async () => {
    setBusy(true);
    setErr(null);
    try {
      const provider = await getActiveProvider();
      setAi(await provider.generateInsights(ctx.data ?? {}));
    } catch (e) {
      setErr(e instanceof Error ? e.message : String(e));
    } finally {
      setBusy(false);
    }
  };

  return (
    <Screen>
      {/* Spend trend headline */}
      <Card>
        <CardHeader title="Spending vs last month" />
        <View className="flex-row items-end justify-between">
          <View>
            <Text variant="display" tone={signTone(totalChange)}>
              {formatPct(totalChange)}
            </Text>
            <Text tone="muted" variant="caption">
              {money(report?.previousTotal ?? 0)} → {money(report?.currentTotal ?? 0)}
            </Text>
          </View>
          <Ionicons
            name={
              (totalChange ?? 0) > 0
                ? "trending-up"
                : (totalChange ?? 0) < 0
                  ? "trending-down"
                  : "remove"
            }
            size={40}
            color={trendColor(totalChange, colors)}
          />
        </View>
      </Card>

      {/* Top increases */}
      {report?.topIncreases.length ? (
        <Card className="mt-3">
          <CardHeader title="Rising categories" subtitle="Biggest increases this month" />
          {report.topIncreases.slice(0, 4).map((d) => (
            <ListItem
              key={d.category}
              title={d.category}
              subtitle={`${money(d.previous)} → ${money(d.current)}`}
              value={money(d.absoluteChange, { sign: true })}
              valueTone="danger"
            />
          ))}
        </Card>
      ) : null}

      {/* Top decreases */}
      {report?.topDecreases.length ? (
        <Card className="mt-3">
          <CardHeader title="Improving categories" subtitle="Biggest reductions" />
          {report.topDecreases.slice(0, 4).map((d) => (
            <ListItem
              key={d.category}
              title={d.category}
              subtitle={`${money(d.previous)} → ${money(d.current)}`}
              value={money(d.absoluteChange, { sign: true })}
              valueTone="positive"
            />
          ))}
        </Card>
      ) : null}

      {/* Anomalies */}
      {report?.anomalies.length ? (
        <Card className="mt-3">
          <CardHeader title="Unusual spikes" />
          {report.anomalies.map((a) => (
            <View key={a.category} className="mb-2 flex-row items-center justify-between">
              <View className="flex-1 pr-2">
                <Text className="font-medium">{a.category}</Text>
                <Text variant="caption" tone="muted">
                  {a.reason}
                </Text>
              </View>
              <Badge variant="warning" label={`${a.multiple.toFixed(1)}×`} />
            </View>
          ))}
        </Card>
      ) : null}

      {/* AI explanation */}
      <Card className="mt-3">
        <CardHeader
          title="What it means"
          right={
            <Button
              size="sm"
              variant="secondary"
              label={ai ? "Refresh" : "Explain"}
              loading={busy}
              onPress={() => void explain()}
            />
          }
        />
        {err ? (
          <Text tone="danger" variant="caption">
            {err}
            {"\n"}
            {ON_DEVICE_HELP_MESSAGE}
          </Text>
        ) : ai ? (
          <View className="gap-3">
            {ai.insights.map((ins, i) => (
              <View key={i}>
                <Text className="font-semibold">{ins.title}</Text>
                {ins.detail ? (
                  <Text tone="muted" variant="caption" className="mt-0.5">
                    {ins.detail}
                  </Text>
                ) : null}
              </View>
            ))}
          </View>
        ) : (
          <Text tone="muted" variant="caption">
            Tap Explain for an AI read on these changes.
          </Text>
        )}
      </Card>

      <View className="h-6" />
    </Screen>
  );
}

function formatPct(p: number | null | undefined): string {
  if (p === null || p === undefined) return "—";
  const pct = Math.round(p * 100);
  return `${pct > 0 ? "+" : ""}${pct}%`;
}

function signTone(p: number | null | undefined): "positive" | "danger" | "muted" {
  if (p === null || p === undefined || p === 0) return "muted";
  return p > 0 ? "danger" : "positive";
}

/** Resolve a concrete trend color (rising spend = danger, falling = positive). */
function trendColor(
  p: number | null | undefined,
  colors: { positive: string; danger: string; mutedForeground: string },
): string {
  if (p === null || p === undefined || p === 0) return colors.mutedForeground;
  return p > 0 ? colors.danger : colors.positive;
}
