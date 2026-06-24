import { View } from "react-native";
import { Bar, CartesianChart } from "victory-native";
import { useTheme } from "../lib/ThemeProvider";
import { Text } from "../components/Text";

export interface BarDatum {
  /** X label (e.g. a month "Jan"). */
  x: string;
  /** Y value. */
  y: number;
  // Index signature so the data is assignable to Victory's `Record<string, unknown>[]`.
  [key: string]: unknown;
}

export interface BarChartProps {
  data: BarDatum[];
  height?: number;
  color?: string;
  /** Show x-axis labels. */
  showAxis?: boolean;
}

/**
 * Trend bar chart (Victory Native XL + Skia). Themed bars with rounded tops;
 * used for month-over-month spend / income comparisons.
 */
export function BarChart({ data, height = 180, color, showAxis = true }: BarChartProps) {
  const { colors } = useTheme();
  if (data.length === 0) {
    return (
      <View style={{ height }} className="items-center justify-center">
        <Text tone="muted">No data</Text>
      </View>
    );
  }
  return (
    <View style={{ height }}>
      <CartesianChart
        data={data}
        xKey="x"
        yKeys={["y"]}
        domainPadding={{ left: 24, right: 24, top: 16 }}
        axisOptions={
          showAxis
            ? {
                lineColor: colors.border,
                labelColor: colors.mutedForeground,
                font: null,
              }
            : undefined
        }
      >
        {({ points, chartBounds }) => (
          <Bar
            points={points.y}
            chartBounds={chartBounds}
            color={color ?? colors.primary}
            roundedCorners={{ topLeft: 8, topRight: 8 }}
            barWidth={18}
          />
        )}
      </CartesianChart>
    </View>
  );
}
