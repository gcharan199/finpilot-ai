import { useRef, useState } from "react";
import {
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { Input, Text, useTheme } from "@finpilot/ui";
import type { ChatMessage } from "@finpilot/ai-engine";
import { useFinanceContext } from "../../src/lib/hooks";
import { getActiveProvider, ON_DEVICE_HELP_MESSAGE } from "../../src/lib/ai";

const STARTERS = [
  "How am I doing this month?",
  "Where can I cut back?",
  "Am I saving enough?",
];

export default function ChatScreen() {
  const { colors } = useTheme();
  const ctx = useFinanceContext();
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [busy, setBusy] = useState(false);
  const scroller = useRef<ScrollView>(null);

  const send = async (text: string) => {
    const content = text.trim();
    if (!content || busy) return;
    const next: ChatMessage[] = [...messages, { role: "user", content }];
    setMessages(next);
    setInput("");
    setBusy(true);
    try {
      const provider = await getActiveProvider();
      const reply = await provider.chat(next, ctx.data ?? {});
      setMessages([...next, { role: "assistant", content: reply }]);
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      setMessages([
        ...next,
        { role: "assistant", content: `${msg}\n\n${ON_DEVICE_HELP_MESSAGE}` },
      ]);
    } finally {
      setBusy(false);
      setTimeout(() => scroller.current?.scrollToEnd({ animated: true }), 50);
    }
  };

  return (
    <SafeAreaView edges={["top"]} className="flex-1 bg-background">
      <View className="flex-row items-center gap-2 px-4 pb-3 pt-2">
        <View className="h-8 w-8 items-center justify-center rounded-lg bg-primary/15">
          <Ionicons name="sparkles" size={18} color={colors.primary} />
        </View>
        <View>
          <Text variant="h2">Copilot</Text>
          <Text variant="caption" tone="muted">
            Grounded in your finances
          </Text>
        </View>
      </View>

      <KeyboardAvoidingView
        className="flex-1"
        behavior={Platform.OS === "ios" ? "padding" : undefined}
        keyboardVerticalOffset={90}
      >
        <ScrollView
          ref={scroller}
          className="flex-1 px-4"
          contentContainerClassName="py-2 gap-3"
        >
          {messages.length === 0 ? (
            <View className="mt-6 gap-3">
              <Text tone="muted" className="text-center">
                Ask anything about your money. The model runs on-device — nothing
                ever leaves your phone.
              </Text>
              <View className="mt-2 gap-2">
                {STARTERS.map((s) => (
                  <Pressable
                    key={s}
                    onPress={() => void send(s)}
                    className="rounded-xl border border-border bg-card px-4 py-3 active:opacity-70"
                  >
                    <Text>{s}</Text>
                  </Pressable>
                ))}
              </View>
            </View>
          ) : (
            messages.map((m, i) => (
              <View
                key={i}
                className={m.role === "user" ? "items-end" : "items-start"}
              >
                <View
                  className={
                    "max-w-[85%] rounded-2xl px-4 py-2.5 " +
                    (m.role === "user" ? "bg-primary" : "bg-card border border-border")
                  }
                >
                  <Text className={m.role === "user" ? "text-primary-foreground" : ""}>
                    {m.content}
                  </Text>
                </View>
              </View>
            ))
          )}
          {busy ? (
            <View className="items-start">
              <View className="rounded-2xl border border-border bg-card px-4 py-2.5">
                <Text tone="muted">Thinking…</Text>
              </View>
            </View>
          ) : null}
        </ScrollView>

        <View className="flex-row items-end gap-2 px-4 pb-3 pt-1">
          <View className="flex-1">
            <Input
              placeholder="Ask your copilot…"
              value={input}
              onChangeText={setInput}
              onSubmitEditing={() => void send(input)}
              returnKeyType="send"
            />
          </View>
          <Pressable
            onPress={() => void send(input)}
            disabled={busy}
            className="h-12 w-12 items-center justify-center rounded-xl bg-primary active:opacity-80 disabled:opacity-40"
          >
            <Ionicons name="arrow-up" size={22} color={colors.primaryForeground} />
          </Pressable>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
