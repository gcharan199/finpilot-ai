import { View } from "react-native";
import { cn } from "../lib/cn";
import { Text } from "./Text";

type Variant = "neutral" | "primary" | "positive" | "warning" | "danger" | "info";

const VARIANT: Record<Variant, { bg: string; text: string }> = {
  neutral: { bg: "bg-muted", text: "text-muted-foreground" },
  primary: { bg: "bg-primary/15", text: "text-primary" },
  positive: { bg: "bg-positive/15", text: "text-positive" },
  warning: { bg: "bg-warning/15", text: "text-warning" },
  danger: { bg: "bg-danger/15", text: "text-danger" },
  info: { bg: "bg-info/15", text: "text-info" },
};

export interface BadgeProps {
  label: string;
  variant?: Variant;
  className?: string;
}

/** Small pill for status / band / category labels. */
export function Badge({ label, variant = "neutral", className }: BadgeProps) {
  const v = VARIANT[variant];
  return (
    <View className={cn("self-start rounded-full px-2.5 py-1", v.bg, className)}>
      <Text variant="caption" className={cn("font-semibold", v.text)}>
        {label}
      </Text>
    </View>
  );
}
