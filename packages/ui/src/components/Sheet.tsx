import React from "react";
import {
  KeyboardAvoidingView,
  Modal as RNModal,
  Platform,
  Pressable,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { cn } from "../lib/cn";
import { Text } from "./Text";

export interface SheetProps {
  visible: boolean;
  onClose: () => void;
  title?: string;
  children: React.ReactNode;
  /** Sheet body className (e.g. for a fixed height). */
  className?: string;
}

/**
 * Bottom sheet built on the RN Modal primitive — a dim scrim, a rounded panel
 * that hugs the bottom safe-area, a grab handle, and a tap-to-dismiss backdrop.
 * Used for add/edit transaction and receipt review.
 */
export function Sheet({ visible, onClose, title, children, className }: SheetProps) {
  return (
    <RNModal
      visible={visible}
      animationType="slide"
      transparent
      onRequestClose={onClose}
      statusBarTranslucent
    >
      <View className="flex-1 justify-end bg-black/50">
        <Pressable className="flex-1" onPress={onClose} accessibilityLabel="Dismiss" />
        <KeyboardAvoidingView
          behavior={Platform.OS === "ios" ? "padding" : undefined}
        >
          <SafeAreaView
            edges={["bottom"]}
            className={cn(
              "rounded-t-[28px] border-t border-border bg-card",
              className,
            )}
          >
            <View className="items-center pt-3">
              <View className="h-1.5 w-12 rounded-full bg-border" />
            </View>
            {title ? (
              <View className="px-5 pt-3">
                <Text variant="h2">{title}</Text>
              </View>
            ) : null}
            <View className="px-5 pb-4 pt-3">{children}</View>
          </SafeAreaView>
        </KeyboardAvoidingView>
      </View>
    </RNModal>
  );
}

/** Alias — a centered Modal variant sharing the Sheet API surface. */
export const Modal = Sheet;
