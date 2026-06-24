import React from "react";
import { Pressable, View } from "react-native";
import { cn } from "../lib/cn";
import { Text } from "./Text";

export interface ListItemProps {
  title: string;
  subtitle?: string;
  /** Leading slot — icon, avatar, category glyph. */
  left?: React.ReactNode;
  /** Trailing primary value (e.g. an amount). */
  value?: string;
  /** Tone for the trailing value. */
  valueTone?: "default" | "positive" | "danger" | "muted";
  /** Trailing secondary line under the value. */
  valueCaption?: string;
  onPress?: () => void;
  className?: string;
}

const VALUE_TONE = {
  default: "text-foreground",
  positive: "text-positive",
  danger: "text-danger",
  muted: "text-muted-foreground",
} as const;

/** A row in a list — transactions, settings, categories. */
export function ListItem({
  title,
  subtitle,
  left,
  value,
  valueTone = "default",
  valueCaption,
  onPress,
  className,
}: ListItemProps) {
  const Container = onPress ? Pressable : View;
  return (
    <Container
      onPress={onPress}
      className={cn(
        "flex-row items-center gap-3 py-3",
        onPress ? "active:opacity-60" : "",
        className,
      )}
    >
      {left ? <View className="h-10 w-10 items-center justify-center">{left}</View> : null}
      <View className="flex-1">
        <Text variant="body" className="font-medium" numberOfLines={1}>
          {title}
        </Text>
        {subtitle ? (
          <Text variant="caption" tone="muted" numberOfLines={1} className="mt-0.5">
            {subtitle}
          </Text>
        ) : null}
      </View>
      {value ? (
        <View className="items-end">
          <Text variant="mono" className={cn("tabular-nums", VALUE_TONE[valueTone])}>
            {value}
          </Text>
          {valueCaption ? (
            <Text variant="caption" tone="muted" className="mt-0.5">
              {valueCaption}
            </Text>
          ) : null}
        </View>
      ) : null}
    </Container>
  );
}
