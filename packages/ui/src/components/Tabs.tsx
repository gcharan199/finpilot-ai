import { Pressable, View } from "react-native";
import { cn } from "../lib/cn";
import { Text } from "./Text";

export interface TabItem {
  key: string;
  label: string;
}

export interface TabsProps {
  items: TabItem[];
  value: string;
  onChange: (key: string) => void;
  className?: string;
}

/**
 * Segmented control — a pill track with a highlighted active segment. In-page
 * tab switcher (e.g. report period, chart range) distinct from the bottom nav.
 */
export function Tabs({ items, value, onChange, className }: TabsProps) {
  return (
    <View className={cn("flex-row rounded-xl bg-muted p-1", className)}>
      {items.map((item) => {
        const active = item.key === value;
        return (
          <Pressable
            key={item.key}
            onPress={() => onChange(item.key)}
            accessibilityRole="tab"
            accessibilityState={{ selected: active }}
            className={cn(
              "flex-1 items-center rounded-lg py-2",
              active ? "bg-card shadow-sm" : "",
            )}
          >
            <Text
              variant="label"
              className={cn("font-semibold", active ? "text-foreground" : "text-muted-foreground")}
            >
              {item.label}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}
