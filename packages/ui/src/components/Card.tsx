import React from "react";
import { View, type ViewProps } from "react-native";
import { cn } from "../lib/cn";
import { Text } from "./Text";

export interface CardProps extends ViewProps {
  className?: string;
  /** Drop the default padding (for media/edge-to-edge content). */
  flush?: boolean;
}

/** Raised surface. The workhorse container of the app. */
export function Card({ className, flush, children, ...props }: CardProps) {
  return (
    <View
      className={cn(
        "rounded-2xl border border-border bg-card",
        flush ? "" : "p-4",
        className,
      )}
      {...props}
    >
      {children}
    </View>
  );
}

/** Optional card header with a title + subtitle + trailing slot. */
export function CardHeader({
  title,
  subtitle,
  right,
  className,
}: {
  title: string;
  subtitle?: string;
  right?: React.ReactNode;
  className?: string;
}) {
  return (
    <View className={cn("mb-3 flex-row items-start justify-between", className)}>
      <View className="flex-1 pr-3">
        <Text variant="h3">{title}</Text>
        {subtitle ? (
          <Text variant="caption" tone="muted" className="mt-0.5">
            {subtitle}
          </Text>
        ) : null}
      </View>
      {right}
    </View>
  );
}
