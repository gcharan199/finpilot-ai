import React from "react";
import { ScrollView, View } from "react-native";
import { SafeAreaView, type Edge } from "react-native-safe-area-context";
import { cn } from "../lib/cn";

export interface ScreenProps {
  children?: React.ReactNode;
  /** Wrap children in a ScrollView (default true). */
  scroll?: boolean;
  /** Safe-area edges to inset. Defaults to top + bottom. */
  edges?: Edge[];
  /** Padding around content (default true). */
  padded?: boolean;
  className?: string;
  contentClassName?: string;
}

/**
 * The page chrome: full-bleed themed background + safe-area insets + optional
 * scroll. Every route renders inside one of these so backgrounds and insets are
 * consistent.
 */
export function Screen({
  scroll = true,
  edges = ["top", "bottom"],
  padded = true,
  className,
  contentClassName,
  children,
}: ScreenProps) {
  const pad = padded ? "px-4 pt-2 pb-6" : "";
  return (
    <SafeAreaView edges={edges} className={cn("flex-1 bg-background", className)}>
      {scroll ? (
        <ScrollView
          className="flex-1"
          contentContainerClassName={cn("grow", pad, contentClassName)}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          {children}
        </ScrollView>
      ) : (
        <View className={cn("flex-1", pad, contentClassName)}>{children}</View>
      )}
    </SafeAreaView>
  );
}
