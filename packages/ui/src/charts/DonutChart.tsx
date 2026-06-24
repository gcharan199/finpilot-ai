import { useMemo } from "react";
import { View } from "react-native";
import { Pie, PolarChart } from "victory-native";
import { chartPalette } from "../theme/tokens";
import { Text } from "../components/Text";

export interface DonutDatum {
  label: string;
  value: number;
  /** Optional explicit color; otherwise assigned from the chart palette. */
  color?: string;
}

export interface DonutChartProps {
  data: DonutDatum[];
  size?: number;
  /** Donut hole as a percentage string, e.g. "62%". */
  innerRadius?: string;
  /** Centerpiece label (e.g. the total). */
  centerLabel?: string;
  centerCaption?: string;
}

/**
 * Category-breakdown donut (Victory Native XL + Skia). Colors fall back to the
 * design-system chart palette so slices stay distinct and on-brand. An optional
 * center label overlays the hole — used for the month's total spend.
 */
export function DonutChart({
  data,
  size = 200,
  innerRadius = "62%",
  centerLabel,
  centerCaption,
}: DonutChartProps) {
  // Victory's PolarChart needs concrete `label`/`value`/`color` string-keyed
  // data; build a flat row type where `color` is required (no optionals).
  const colored = useMemo<{ label: string; value: number; color: string }[]>(
    () =>
      data.map((d, i) => ({
        label: d.label,
        value: d.value,
        color: d.color ?? chartPalette[i % chartPalette.length]!,
      })),
    [data],
  );

  if (colored.length === 0) {
    return (
      <View style={{ height: size }} className="items-center justify-center">
        <Text tone="muted">No spending yet</Text>
      </View>
    );
  }

  return (
    <View style={{ height: size, width: size }} className="items-center justify-center">
      <PolarChart
        data={colored}
        labelKey="label"
        valueKey="value"
        colorKey="color"
      >
        <Pie.Chart innerRadius={innerRadius} />
      </PolarChart>
      {centerLabel ? (
        <View className="absolute items-center" pointerEvents="none">
          <Text variant="h2" className="tabular-nums">
            {centerLabel}
          </Text>
          {centerCaption ? (
            <Text variant="caption" tone="muted" className="mt-0.5">
              {centerCaption}
            </Text>
          ) : null}
        </View>
      ) : null}
    </View>
  );
}
