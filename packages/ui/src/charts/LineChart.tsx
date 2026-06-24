import { View } from "react-native";
import { CartesianChart, Line } from "victory-native";
import { useTheme } from "../lib/ThemeProvider";
import { Text } from "../components/Text";

export interface LineDatum {
  x: string;
  y: number;
  // Index signature so the data is assignable to Victory's `Record<string, unknown>[]`.
  [key: string]: unknown;
}

export interface LineChartProps {
  data: LineDatum[];
  height?: number;
  color?: string;
  showAxis?: boolean;
}

/**
 * Trend line chart (Victory Native XL + Skia). A smooth themed line for net /
 * balance trends. Curve is "natural" for a friendly read of the data.
 */
export function LineChart({ data, height = 180, color, showAxis = true }: LineChartProps) {
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
        domainPadding={{ left: 16, right: 16, top: 16, bottom: 8 }}
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
        {({ points }) => (
          <Line
            points={points.y}
            color={color ?? colors.primary}
            strokeWidth={3}
            curveType="natural"
          />
        )}
      </CartesianChart>
    </View>
  );
}
