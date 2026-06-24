import { useEffect, useState } from "react";
import { Linking, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import {
  Button,
  Card,
  CardHeader,
  Input,
  Screen,
  Tabs,
  Text,
  useTheme,
} from "@finpilot/ui";
import {
  getGeminiApiKey,
  getProvider,
  getThemeChoice,
  setGeminiApiKey,
  setProvider,
  setThemeChoice,
  type ProviderChoice,
  type ThemeChoice,
} from "../../src/lib/settings";

export default function SettingsScreen() {
  const { colors, setPreference } = useTheme();
  const [provider, setProviderState] = useState<ProviderChoice>("gemini");
  const [theme, setThemeState] = useState<ThemeChoice>("system");
  const [apiKey, setApiKey] = useState("");
  const [savedKey, setSavedKey] = useState(false);
  const [revealed, setRevealed] = useState(false);

  useEffect(() => {
    (async () => {
      setProviderState(await getProvider());
      setThemeState(await getThemeChoice());
      const key = await getGeminiApiKey();
      setApiKey(key);
      setSavedKey(key.length > 0);
    })();
  }, []);

  const onProvider = async (p: ProviderChoice) => {
    setProviderState(p);
    await setProvider(p);
  };
  const onTheme = async (t: ThemeChoice) => {
    setThemeState(t);
    await setThemeChoice(t);
    setPreference(t);
  };
  const onSaveKey = async () => {
    await setGeminiApiKey(apiKey);
    setSavedKey(apiKey.trim().length > 0);
  };

  const masked = apiKey ? `${apiKey.slice(0, 4)}••••••••${apiKey.slice(-4)}` : "";

  return (
    <Screen>
      <Text variant="h1" className="mb-3 mt-2">
        Settings
      </Text>

      {/* AI provider */}
      <Card>
        <CardHeader title="AI provider" subtitle="Which engine powers the copilot" />
        <Tabs
          items={[
            { key: "gemini", label: "Gemini (cloud)" },
            { key: "on-device", label: "On-device" },
          ]}
          value={provider}
          onChange={(k) => void onProvider(k as ProviderChoice)}
        />
        {provider === "on-device" ? (
          <View className="mt-3 rounded-xl bg-muted p-3">
            <Text variant="caption" tone="warning" className="font-semibold">
              Requires a dev build
            </Text>
            <Text variant="caption" tone="muted" className="mt-1">
              On-device inference needs a native model + an EAS dev build (it
              cannot run in Expo Go or a standard export). Until then, AI calls
              will return a clear “not available” error.
            </Text>
            <Button
              size="sm"
              variant="ghost"
              label="Read docs/on-device.md"
              className="mt-1 self-start"
              onPress={() =>
                void Linking.openURL(
                  "https://github.com/charangoriparthi/finpilot-ai/blob/main/docs/on-device.md",
                )
              }
            />
          </View>
        ) : null}
      </Card>

      {/* Gemini key */}
      {provider === "gemini" ? (
        <Card className="mt-3">
          <CardHeader
            title="Gemini API key"
            subtitle="Stored securely in your device keychain"
          />
          <Input
            placeholder="Paste your Gemini API key"
            value={apiKey}
            onChangeText={setApiKey}
            autoCapitalize="none"
            autoCorrect={false}
            secureTextEntry={!revealed}
            right={
              <Ionicons
                name={revealed ? "eye-off" : "eye"}
                size={18}
                color={colors.mutedForeground}
                onPress={() => setRevealed((r) => !r)}
              />
            }
            hint={savedKey ? `Saved: ${masked}` : "No key saved yet"}
          />
          <Button label="Save key" className="mt-3" onPress={() => void onSaveKey()} />

          <View className="mt-3 rounded-xl bg-danger/10 p-3">
            <Text variant="caption" tone="danger" className="font-semibold">
              Heads up: client-side key
            </Text>
            <Text variant="caption" tone="muted" className="mt-1">
              This app calls Gemini directly from your phone, so the key lives on
              the device. That is fine for personal use, but a production app
              would proxy requests through a backend so the key is never shipped
              to clients.
            </Text>
          </View>
        </Card>
      ) : null}

      {/* Appearance */}
      <Card className="mt-3">
        <CardHeader title="Appearance" />
        <Tabs
          items={[
            { key: "system", label: "System" },
            { key: "light", label: "Light" },
            { key: "dark", label: "Dark" },
          ]}
          value={theme}
          onChange={(k) => void onTheme(k as ThemeChoice)}
        />
      </Card>

      {/* About */}
      <Card className="mt-3">
        <CardHeader title="About" />
        <View className="gap-1">
          <Text variant="caption" tone="muted">
            FinPilot AI · v0.1.0
          </Text>
          <Text variant="caption" tone="muted">
            A privacy-first personal-finance copilot. Your transactions stay on
            this device (local SQLite); only the finance summary you see is sent
            to the AI provider for chat and insights.
          </Text>
        </View>
      </Card>

      <View className="h-6" />
    </Screen>
  );
}
