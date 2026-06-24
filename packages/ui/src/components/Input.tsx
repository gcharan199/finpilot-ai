import React from "react";
import { TextInput, type TextInputProps, View } from "react-native";
import { cn } from "../lib/cn";
import { useTheme } from "../lib/ThemeProvider";
import { Text } from "./Text";

export interface InputProps extends TextInputProps {
  label?: string;
  /** Validation / helper line under the field. */
  hint?: string;
  error?: string;
  /** Leading adornment (e.g. a currency symbol). */
  left?: React.ReactNode;
  /** Trailing adornment. */
  right?: React.ReactNode;
  className?: string;
  containerClassName?: string;
}

/** Themed text field with label, adornments, and an error state. */
export function Input({
  label,
  hint,
  error,
  left,
  right,
  className,
  containerClassName,
  ...props
}: InputProps) {
  const { colors } = useTheme();
  return (
    <View className={containerClassName}>
      {label ? (
        <Text variant="label" tone="muted" className="mb-1.5">
          {label}
        </Text>
      ) : null}
      <View
        className={cn(
          "h-12 flex-row items-center gap-2 rounded-xl border bg-muted px-3",
          error ? "border-danger" : "border-border",
        )}
      >
        {left}
        <TextInput
          placeholderTextColor={colors.mutedForeground}
          className={cn("h-full flex-1 text-[15px] text-foreground", className)}
          {...props}
        />
        {right}
      </View>
      {error ? (
        <Text variant="caption" tone="danger" className="mt-1">
          {error}
        </Text>
      ) : hint ? (
        <Text variant="caption" tone="muted" className="mt-1">
          {hint}
        </Text>
      ) : null}
    </View>
  );
}
