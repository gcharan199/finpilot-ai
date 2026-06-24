import { useCallback, useEffect, useState } from "react";
import { Pressable, View } from "react-native";
import { router } from "expo-router";
import * as LocalAuthentication from "expo-local-authentication";
import { Ionicons } from "@expo/vector-icons";
import { Button, Screen, Text, useTheme } from "@finpilot/ui";
import { useLock } from "../src/lib/lock";
import { getPin, hasPin, setPin } from "../src/lib/settings";

type Mode = "loading" | "biometric" | "set-pin" | "enter-pin";

/**
 * Lock + onboarding gate. On first run (no PIN set) it walks the user through
 * creating a 4-digit PIN. After that it offers biometrics (Face ID / fingerprint)
 * with a PIN fallback. A successful unlock flips the session lock and routes in.
 */
export default function LockScreen() {
  const { colors } = useTheme();
  const { unlock } = useLock();
  const [mode, setMode] = useState<Mode>("loading");
  const [entry, setEntry] = useState("");
  const [draftPin, setDraftPin] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const finishUnlock = useCallback(() => {
    unlock();
    router.replace("/(tabs)");
  }, [unlock]);

  const tryBiometric = useCallback(async () => {
    const hasHw = await LocalAuthentication.hasHardwareAsync();
    const enrolled = await LocalAuthentication.isEnrolledAsync();
    if (!hasHw || !enrolled) {
      setMode("enter-pin");
      return;
    }
    const res = await LocalAuthentication.authenticateAsync({
      promptMessage: "Unlock FinPilot",
      fallbackLabel: "Use PIN",
    });
    if (res.success) finishUnlock();
    else setMode("enter-pin");
  }, [finishUnlock]);

  // Decide the initial mode from whether a PIN exists.
  useEffect(() => {
    (async () => {
      if (await hasPin()) {
        setMode("biometric");
        void tryBiometric();
      } else {
        setMode("set-pin");
      }
    })();
  }, [tryBiometric]);

  const onDigit = useCallback(
    async (d: string) => {
      setError(null);
      const next = (entry + d).slice(0, 4);
      setEntry(next);
      if (next.length < 4) return;

      if (mode === "set-pin") {
        if (draftPin === null) {
          setDraftPin(next);
          setEntry("");
        } else if (draftPin === next) {
          await setPin(next);
          finishUnlock();
        } else {
          setError("PINs didn't match. Try again.");
          setDraftPin(null);
          setEntry("");
        }
      } else if (mode === "enter-pin") {
        const saved = await getPin();
        if (saved === next) finishUnlock();
        else {
          setError("Incorrect PIN.");
          setEntry("");
        }
      }
    },
    [entry, mode, draftPin, finishUnlock],
  );

  const onBackspace = useCallback(() => setEntry((e) => e.slice(0, -1)), []);

  const title =
    mode === "set-pin"
      ? draftPin === null
        ? "Create a PIN"
        : "Confirm your PIN"
      : "Enter your PIN";

  return (
    <Screen scroll={false} padded>
      <View className="flex-1 items-center justify-center">
        <View className="h-16 w-16 items-center justify-center rounded-2xl bg-primary/15">
          <Ionicons name="lock-closed" size={30} color={colors.primary} />
        </View>
        <Text variant="h1" className="mt-5">
          FinPilot
        </Text>

        {mode === "loading" || mode === "biometric" ? (
          <Text tone="muted" className="mt-2">
            Authenticating…
          </Text>
        ) : (
          <>
            <Text tone="muted" className="mt-2">
              {title}
            </Text>

            <View className="mt-6 flex-row gap-3">
              {[0, 1, 2, 3].map((i) => (
                <View
                  key={i}
                  className={
                    "h-3.5 w-3.5 rounded-full " +
                    (i < entry.length ? "bg-primary" : "bg-muted")
                  }
                />
              ))}
            </View>

            {error ? (
              <Text tone="danger" variant="caption" className="mt-3">
                {error}
              </Text>
            ) : (
              <View className="mt-3 h-4" />
            )}

            <Keypad onDigit={onDigit} onBackspace={onBackspace} />

            {mode === "enter-pin" ? (
              <Button
                variant="ghost"
                label="Use Face ID / fingerprint"
                className="mt-2"
                onPress={() => void tryBiometric()}
              />
            ) : null}
          </>
        )}
      </View>
    </Screen>
  );
}

/** A simple 3×4 numeric keypad. */
function Keypad({
  onDigit,
  onBackspace,
}: {
  onDigit: (d: string) => void;
  onBackspace: () => void;
}) {
  const keys = ["1", "2", "3", "4", "5", "6", "7", "8", "9", "", "0", "⌫"];
  return (
    <View className="mt-8 w-72 flex-row flex-wrap">
      {keys.map((k, i) => (
        <View key={i} className="w-1/3 items-center py-2">
          {k === "" ? (
            <View className="h-16 w-16" />
          ) : (
            <Pressable
              onPress={() => (k === "⌫" ? onBackspace() : onDigit(k))}
              className="h-16 w-16 items-center justify-center rounded-full bg-muted active:opacity-60"
            >
              <Text variant="h2">{k}</Text>
            </Pressable>
          )}
        </View>
      ))}
    </View>
  );
}
