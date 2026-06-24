import React from "react";
import { ActivityIndicator, Pressable, type PressableProps, View } from "react-native";
import { cn } from "../lib/cn";
import { useTheme } from "../lib/ThemeProvider";
import { Text } from "./Text";

type Variant = "primary" | "secondary" | "outline" | "ghost" | "danger";
type Size = "sm" | "md" | "lg";

const BASE =
  "flex-row items-center justify-center rounded-xl active:opacity-90 disabled:opacity-40";

const VARIANT: Record<Variant, { container: string; label: string }> = {
  primary: { container: "bg-primary", label: "text-primary-foreground" },
  secondary: { container: "bg-muted", label: "text-foreground" },
  outline: { container: "border border-border bg-transparent", label: "text-foreground" },
  ghost: { container: "bg-transparent", label: "text-foreground" },
  danger: { container: "bg-danger", label: "text-white" },
};

const SIZE: Record<Size, { container: string; text: "label" | "body" }> = {
  sm: { container: "h-9 px-3 gap-1.5", text: "label" },
  md: { container: "h-12 px-4 gap-2", text: "body" },
  lg: { container: "h-14 px-5 gap-2.5", text: "body" },
};

export interface ButtonProps extends Omit<PressableProps, "children"> {
  label: string;
  variant?: Variant;
  size?: Size;
  loading?: boolean;
  /** Optional leading element (e.g. an icon). */
  left?: React.ReactNode;
  className?: string;
}

/** Primary action control. Honors variant, size, loading, and disabled states. */
export function Button({
  label,
  variant = "primary",
  size = "md",
  loading = false,
  left,
  disabled,
  className,
  ...props
}: ButtonProps) {
  const v = VARIANT[variant];
  const s = SIZE[size];
  const { colors } = useTheme();
  const spinnerColor =
    variant === "primary"
      ? colors.primaryForeground
      : variant === "danger"
        ? "#ffffff"
        : colors.foreground;
  return (
    <Pressable
      accessibilityRole="button"
      disabled={disabled || loading}
      className={cn(BASE, v.container, s.container, className)}
      {...props}
    >
      {loading ? (
        <ActivityIndicator size="small" color={spinnerColor} />
      ) : (
        <>
          {left ? <View>{left}</View> : null}
          <Text variant={s.text} className={cn("font-semibold", v.label)}>
            {label}
          </Text>
        </>
      )}
    </Pressable>
  );
}
