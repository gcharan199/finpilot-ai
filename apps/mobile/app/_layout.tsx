import "../global.css";
import { useEffect, useState } from "react";
import { View } from "react-native";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { Stack } from "expo-router";
import { StatusBar } from "expo-status-bar";
import * as SplashScreen from "expo-splash-screen";
import { QueryClientProvider } from "@tanstack/react-query";
import { ThemeProvider, Text, useTheme } from "@finpilot/ui";
import { initDatabase } from "../src/db";
import { queryClient } from "../src/lib/queryClient";
import { LockProvider } from "../src/lib/lock";

SplashScreen.preventAutoHideAsync().catch(() => {});

/** Themed status bar — defined inside ThemeProvider so it follows the scheme. */
function ThemedStatusBar() {
  const { name } = useTheme();
  return <StatusBar style={name === "dark" ? "light" : "dark"} />;
}

export default function RootLayout() {
  const [ready, setReady] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    initDatabase()
      .then(() => {
        if (active) setReady(true);
      })
      .catch((e: unknown) => {
        if (active) setError(e instanceof Error ? e.message : String(e));
      })
      .finally(() => {
        SplashScreen.hideAsync().catch(() => {});
      });
    return () => {
      active = false;
    };
  }, []);

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        <QueryClientProvider client={queryClient}>
          <ThemeProvider>
            <LockProvider>
              <ThemedStatusBar />
              {error ? (
                <View className="flex-1 items-center justify-center bg-background p-6">
                  <Text variant="h2" tone="danger">
                    Startup error
                  </Text>
                  <Text tone="muted" className="mt-2 text-center">
                    {error}
                  </Text>
                </View>
              ) : !ready ? (
                <View className="flex-1 items-center justify-center bg-background">
                  <Text variant="display" tone="primary">
                    FinPilot
                  </Text>
                  <Text tone="muted" className="mt-1">
                    Preparing your finances…
                  </Text>
                </View>
              ) : (
                <Stack screenOptions={{ headerShown: false }}>
                  <Stack.Screen name="index" />
                  <Stack.Screen name="lock" options={{ gestureEnabled: false }} />
                  <Stack.Screen name="(tabs)" />
                  <Stack.Screen
                    name="scanner"
                    options={{ presentation: "modal", headerShown: true, title: "Scan receipt" }}
                  />
                  <Stack.Screen
                    name="budget"
                    options={{ headerShown: true, title: "Budget planner" }}
                  />
                  <Stack.Screen
                    name="insights"
                    options={{ headerShown: true, title: "Insights" }}
                  />
                </Stack>
              )}
            </LockProvider>
          </ThemeProvider>
        </QueryClientProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}
