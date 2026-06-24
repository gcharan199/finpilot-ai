import { useState } from "react";
import { Image, View } from "react-native";
import { router } from "expo-router";
import * as ImagePicker from "expo-image-picker";
import { Ionicons } from "@expo/vector-icons";
import {
  Button,
  Card,
  Input,
  Screen,
  Text,
  useTheme,
} from "@finpilot/ui";
import type { Receipt } from "@finpilot/ai-engine";
import { useAddTransaction, useCategories } from "../src/lib/hooks";
import { getActiveProvider, NO_KEY_MESSAGE } from "../src/lib/ai";

type Phase = "capture" | "extracting" | "review";

/**
 * Receipt scanner: pick/take a photo → base64 → provider.extractReceipt →
 * review the extracted fields → save as a transaction. Camera + library both
 * route through expo-image-picker (camera needs a dev/standalone build; the
 * library path works in Expo Go).
 */
export default function ScannerScreen() {
  const { colors } = useTheme();
  const categories = useCategories();
  const add = useAddTransaction();

  const [phase, setPhase] = useState<Phase>("capture");
  const [preview, setPreview] = useState<string | null>(null);
  const [receipt, setReceipt] = useState<Receipt | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleImage = async (asset: ImagePicker.ImagePickerAsset) => {
    setPreview(asset.uri);
    setError(null);
    if (!asset.base64) {
      setError("Could not read image data.");
      return;
    }
    setPhase("extracting");
    try {
      const provider = await getActiveProvider();
      const mime = asset.mimeType ?? "image/jpeg";
      const extracted = await provider.extractReceipt(asset.base64, mime);
      setReceipt(extracted);
      setPhase("review");
    } catch (e) {
      setError(`${e instanceof Error ? e.message : String(e)}\n${NO_KEY_MESSAGE}`);
      setPhase("capture");
    }
  };

  const pickFromLibrary = async () => {
    const res = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ["images"],
      base64: true,
      quality: 0.6,
    });
    if (!res.canceled && res.assets[0]) await handleImage(res.assets[0]);
  };

  const takePhoto = async () => {
    const perm = await ImagePicker.requestCameraPermissionsAsync();
    if (!perm.granted) {
      setError("Camera permission denied.");
      return;
    }
    const res = await ImagePicker.launchCameraAsync({ base64: true, quality: 0.6 });
    if (!res.canceled && res.assets[0]) await handleImage(res.assets[0]);
  };

  const save = async () => {
    if (!receipt) return;
    const cat = categories.data?.find((c) => c.name === receipt.category);
    await add.mutateAsync({
      amount: receipt.amount,
      type: "expense",
      categoryId: cat?.id ?? null,
      merchant: receipt.merchant,
      note: receipt.gst > 0 ? `GST ${receipt.gst}` : undefined,
      date: receipt.date ?? new Date().toISOString().slice(0, 10),
      source: "receipt",
    });
    router.back();
  };

  return (
    <Screen>
      {preview ? (
        <Image
          source={{ uri: preview }}
          className="mb-4 h-48 w-full rounded-2xl"
          resizeMode="cover"
        />
      ) : (
        <Card className="mb-4 items-center py-10">
          <Ionicons name="receipt-outline" size={44} color={colors.mutedForeground} />
          <Text variant="h3" className="mt-3">
            Scan a receipt
          </Text>
          <Text tone="muted" variant="caption" className="mt-1 text-center">
            We extract the merchant, total, GST, date and category with AI.
          </Text>
        </Card>
      )}

      {error ? (
        <Card className="mb-4 border-danger">
          <Text tone="danger" variant="caption">
            {error}
          </Text>
        </Card>
      ) : null}

      {phase === "capture" ? (
        <View className="gap-3">
          <Button
            label="Take photo"
            left={<Ionicons name="camera" size={18} color={colors.primaryForeground} />}
            onPress={() => void takePhoto()}
          />
          <Button
            variant="secondary"
            label="Choose from library"
            onPress={() => void pickFromLibrary()}
          />
        </View>
      ) : null}

      {phase === "extracting" ? (
        <Card className="items-center py-8">
          <Text tone="muted">Reading your receipt…</Text>
        </Card>
      ) : null}

      {phase === "review" && receipt ? (
        <Card>
          <Text variant="h3" className="mb-3">
            Review & save
          </Text>
          <View className="gap-3">
            <Input
              label="Merchant"
              value={receipt.merchant}
              onChangeText={(v) => setReceipt({ ...receipt, merchant: v })}
            />
            <Input
              label="Amount"
              keyboardType="decimal-pad"
              value={String(receipt.amount)}
              onChangeText={(v) =>
                setReceipt({ ...receipt, amount: Number.parseFloat(v) || 0 })
              }
              left={<Text tone="muted">$</Text>}
            />
            <Input
              label="GST / tax"
              keyboardType="decimal-pad"
              value={String(receipt.gst)}
              onChangeText={(v) =>
                setReceipt({ ...receipt, gst: Number.parseFloat(v) || 0 })
              }
              left={<Text tone="muted">$</Text>}
            />
            <Input
              label="Date"
              value={receipt.date ?? ""}
              onChangeText={(v) => setReceipt({ ...receipt, date: v })}
              placeholder="yyyy-mm-dd"
            />
            <View>
              <Text variant="label" tone="muted" className="mb-1">
                Category
              </Text>
              <Text>{receipt.category}</Text>
            </View>
          </View>
          <Button
            label="Save transaction"
            className="mt-4"
            loading={add.isPending}
            onPress={() => void save()}
          />
        </Card>
      ) : null}
    </Screen>
  );
}
