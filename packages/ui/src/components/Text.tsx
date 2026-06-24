import { Text as RNText, type TextProps as RNTextProps } from "react-native";
import { cn } from "../lib/cn";

type Variant = "display" | "h1" | "h2" | "h3" | "body" | "label" | "caption" | "mono";
type Tone = "default" | "muted" | "primary" | "positive" | "warning" | "danger" | "info";

const VARIANT: Record<Variant, string> = {
  display: "text-[34px] leading-[40px] font-extrabold tracking-tight",
  h1: "text-[26px] leading-8 font-bold tracking-tight",
  h2: "text-xl leading-7 font-bold",
  h3: "text-[17px] leading-6 font-semibold",
  body: "text-[15px] leading-[22px]",
  label: "text-[13px] leading-[18px] font-medium",
  caption: "text-xs leading-4",
  mono: "text-[15px] leading-5 font-semibold",
};

const TONE: Record<Tone, string> = {
  default: "text-foreground",
  muted: "text-muted-foreground",
  primary: "text-primary",
  positive: "text-positive",
  warning: "text-warning",
  danger: "text-danger",
  info: "text-info",
};

export interface TextProps extends RNTextProps {
  variant?: Variant;
  tone?: Tone;
  className?: string;
}

/** Themed text primitive. All copy in the app flows through this. */
export function Text({
  variant = "body",
  tone = "default",
  className,
  ...props
}: TextProps) {
  return <RNText className={cn(VARIANT[variant], TONE[tone], className)} {...props} />;
}

/** A heading shortcut. `level` 1–3 maps to the display/h scale. */
export function Heading({
  level = 1,
  className,
  ...props
}: TextProps & { level?: 1 | 2 | 3 }) {
  const variant: Variant = level === 1 ? "h1" : level === 2 ? "h2" : "h3";
  return <Text variant={variant} className={className} {...props} />;
}
