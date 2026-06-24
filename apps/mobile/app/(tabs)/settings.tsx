import { useEffect, useState } from "react";
import { Linking, View } from "react-native";
import {
  Badge,
  Button,
  Card,
  CardHeader,
  Screen,
  Tabs,
  Text,
  useTheme,
} from "@finpilot/ui";
import {
  getModelId,
  getThemeChoice,
  isModelDownloaded,
  setThemeChoice,
  type ThemeChoice,
} from "../../src/lib/settings";

const DOCS_URL =
  "https://github.com/charangoriparthi/finpilot-ai/blob/main/docs/on-device.md";

export default function SettingsScreen() {
  const { setPreference } = useTheme();
  const [theme, setThemeState] = useState<ThemeChoice>("system");
  const [modelId, setModel] = useState("");
  const [modelReady, setModelReady] = useState(false);

  useEffect(() => {
    (async () => {
      setThemeState(await getThemeChoice());
      setModel(await getModelId());
      setModelReady(await isModelDownloaded());
    })();
  }, []);

  const onTheme = async (t: ThemeChoice) => {
    setThemeState(t);
    await setThemeChoice(t);
    setPreference(t);
  };

  return (
    <Screen>
      <Text variant="h1" className="mb-3 mt-2">
        Settings
      </Text>

      {/* On-device AI model */}
      <Card>
        <CardHeader
          title="On-device AI model"
          subtitle="The local LLM that powers chat, insights & budgets"
          right={
            <Badge
              variant={modelReady ? "positive" : "warning"}
              label={modelReady ? "Loaded" : "Not loaded"}
            />
          }
        />
        <View className="gap-1">
          <View className="flex-row items-center justify-between">
            <Text tone="muted" variant="caption">
              Model
            </Text>
            <Text variant="mono">{modelId || "—"}</Text>
          </View>
          <Text variant="caption" tone="muted" className="mt-1">
            Runs entirely on this device with llama.rn — no cloud, no API key,
            nothing leaves your phone.
          </Text>
        </View>

        <View className="mt-3 rounded-xl bg-muted p-3">
          <Text variant="caption" tone="warning" className="font-semibold">
            Requires a dev build
          </Text>
          <Text variant="caption" tone="muted" className="mt-1">
            On-device inference needs a native runtime + a downloaded GGUF model
            (a few GB) and an EAS dev build — it cannot run in Expo Go or a
            standard export. Until then, AI chat / receipt OCR show a clear
            “enable on-device AI” message, while all of your local finance
            features (tracking, health score, budgets, reports) keep working.
          </Text>
          <Button
            size="sm"
            variant="ghost"
            label="Read docs/on-device.md"
            className="mt-1 self-start"
            onPress={() => void Linking.openURL(DOCS_URL)}
          />
        </View>
      </Card>

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
            A privacy-first, 100% on-device personal-finance copilot. Your
            transactions live in local SQLite and every AI capability — chat,
            insights, budgets and receipt OCR — runs on this device. No cloud, no
            account, no API key. Nothing ever leaves your phone.
          </Text>
        </View>
      </Card>

      <View className="h-6" />
    </Screen>
  );
}
