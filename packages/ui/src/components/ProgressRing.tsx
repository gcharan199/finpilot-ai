import { View } from "react-native";
import {
  Canvas,
  Path,
  Skia,
  SweepGradient,
  vec,
  Group,
} from "@shopify/react-native-skia";
import { useTheme } from "../lib/ThemeProvider";
import { Text } from "./Text";

export interface ProgressRingProps {
  /** 0–100. */
  value: number;
  size?: number;
  strokeWidth?: number;
  /** Big number in the middle (defaults to rounded `value`). */
  label?: string;
  /** Caption under the label (e.g. the band). */
  caption?: string;
  /** Gradient endpoints; defaults to the theme primary + accent. */
  colors?: [string, string];
}

/**
 * Circular score gauge rendered with Skia. The arc sweeps 0→value of a full
 * circle with a two-stop gradient; the track is a faint full ring. Used for the
 * dashboard health score — the visual centerpiece of the app.
 */
export function ProgressRing({
  value,
  size = 180,
  strokeWidth = 16,
  label,
  caption,
  colors,
}: ProgressRingProps) {
  const theme = useTheme();
  const clamped = Math.max(0, Math.min(100, value));
  const r = (size - strokeWidth) / 2;
  const cx = size / 2;
  const cy = size / 2;

  // Full-circle track + the progress arc as a trimmed copy of the same path.
  const ring = Skia.Path.Make();
  ring.addCircle(cx, cy, r);

  const arc = ring.copy();
  arc.trim(0, clamped / 100, false);
  // Rotate so the arc starts at 12 o'clock instead of 3 o'clock.
  const transform = Skia.Matrix();
  transform.translate(cx, cy);
  transform.rotate(-Math.PI / 2);
  transform.translate(-cx, -cy);
  arc.transform(transform);
  ring.transform(transform);

  const [c0, c1] = colors ?? [theme.colors.primary, theme.colors.accent];

  return (
    <View style={{ width: size, height: size }} className="items-center justify-center">
      <Canvas style={{ width: size, height: size, position: "absolute" }}>
        <Group>
          <Path
            path={ring}
            style="stroke"
            strokeWidth={strokeWidth}
            color={theme.colors.muted}
            strokeCap="round"
          />
          <Path
            path={arc}
            style="stroke"
            strokeWidth={strokeWidth}
            strokeCap="round"
          >
            <SweepGradient c={vec(cx, cy)} colors={[c0, c1, c0]} />
          </Path>
        </Group>
      </Canvas>
      <View className="items-center">
        <Text variant="display" className="tabular-nums">
          {label ?? String(Math.round(clamped))}
        </Text>
        {caption ? (
          <Text variant="label" tone="muted" className="mt-0.5 uppercase tracking-wider">
            {caption}
          </Text>
        ) : null}
      </View>
    </View>
  );
}
