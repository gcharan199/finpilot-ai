# On-device AI & OCR

FinPilot AI is **100% on-device**: there is no cloud, no account, and no API key. Every AI
capability and all OCR run **locally on the phone**, so nothing — transactions, receipt images,
OCR text, or chat prompts — ever leaves the device.

There are two on-device seams in `@finpilot/ai-engine`, plus a pure parser in
`@finpilot/finance-engine`:

| Seam | Library (chosen) | What it does | OSS alternative |
| ---- | ---------------- | ------------ | --------------- |
| `AIProvider` → `OnDeviceProvider` | [`llama.rn`](https://github.com/mybigday/llama.rn) (GGUF) | chat · insight & budget narratives | n/a (llama.cpp is itself OSS) |
| `OcrEngine` → `MlKitOcrEngine` | [`@react-native-ml-kit/text-recognition`](https://github.com/a7medev/react-native-ml-kit) | on-device receipt text recognition | [`react-native-tesseract-ocr`](https://github.com/jonjomckay/react-native-tesseract-ocr) (Tesseract) |
| `parseReceiptText` | pure TypeScript (no RN deps) | OCR text → `{merchant, amount, gst, date, category}` | — (it *is* the OSS core) |

## Why on-device LLM = `llama.rn`

We picked **`llama.rn`** over `react-native-ai` (MLC) for Expo + the new architecture on RN 0.85
because it:

- ships **prebuilt native binaries** and a config plugin, so an EAS dev build "just works";
- consumes **plain GGUF** files — you can bundle or download any quantized model (e.g. **Gemma 3n
  2B** or **Qwen3 1.7B**) with no separate model-compilation step (MLC requires compiling each
  model to its own runtime artifact);
- has a larger, more active ecosystem and a simple `initLlama({ model }) → context.completion(...)`
  API that maps cleanly onto our `AIProvider` interface.

Structured outputs (insights, budgets) are produced by prompting the model for JSON and parsing the
reply through the existing zod schemas (`safeParseJson`) — exactly as before.

## Why on-device OCR = ML Kit

**`@react-native-ml-kit/text-recognition`** wraps Google **ML Kit** text recognition, which runs
**entirely on the device with no network access**. It ships native binaries, exposes a one-call
`TextRecognition.recognize(uri)` API, and is the most robust on-device OCR for React Native. A
fully-open-source alternative — **Tesseract** via `react-native-tesseract-ocr` — drops in behind the
same `OcrEngine` interface if you want a pure-OSS stack; only `ocr.ts` changes.

## Why these are dynamic imports

The native LLM/OCR libraries contain native code that **cannot** be imported in Node, in Jest, or
during Metro/Expo bundling for a non-dev client. So neither is ever `import`ed statically. Instead,
at call time:

```ts
const specifier = "llama.rn";        // non-literal on purpose
const mod = await import(specifier);  // resolved only when installed
```

inside a `try`/`catch`. The non-literal specifier is neutralized for the standard bundle by the
app-local Babel transform (`apps/mobile/babel-plugins/strip-dynamic-import.js`), and the guarded
import throws a clear, actionable error when the lib is absent:

> on-device AI requires an EAS dev build + an on-device model; see docs/on-device.md
> on-device OCR requires an EAS dev build (native text-recognition module); see docs/on-device.md

This keeps `pnpm install`, Node unit tests, and standard Expo bundles working with **no native
dependency** required.

## The receipt path is 100% local

```
camera/image → on-device OCR (MlKitOcrEngine.recognize) → parseReceiptText() → save
```

`parseReceiptText` (in `@finpilot/finance-engine`) is a pure, deterministic, **unit-tested**
function (13 real-world receipt-text fixtures, clean + messy). It finds the total via total-line
heuristics (falling back to the largest currency value), the tax/GST line, the date (many formats →
`yyyy-mm-dd`), and the merchant (top meaningful line), then categorizes via the existing
`categorize`. The on-device LLM can *optionally* refine ambiguous fields, but the parser stands
alone.

## Enabling on-device AI/OCR (in the mobile app)

1. Create an **EAS dev build** (the native libs cannot run in Expo Go):

   ```bash
   cd apps/mobile
   npx expo install llama.rn @react-native-ml-kit/text-recognition
   eas build --profile development --platform ios   # or android
   ```

2. **Download a quantized GGUF model** onto the device into the app's documents directory:

   `<documentDirectory>/models/<model-id>.gguf`

   The selected model id is shown in **Settings → On-device AI model** (default
   `gemma-3n-2b-it-Q4_K_M.gguf`). `isModelDownloaded()` reports honest "Loaded / Not loaded" status.

3. Run the dev build on a device. The provider satisfies the same `AIProvider` interface, so app
   code is unchanged; chat, insights, budgets, and the receipt scanner now run fully on-device.

## Graceful degradation (Expo Go / CI)

Without a dev build + model, the **AI chat** and **receipt scanner** screens show a clear *"Enable
on-device AI in a dev build (see docs/on-device.md)"* state and never crash — and they never call a
cloud, because there is none. Everything else (manual tracking, charts, the **Financial Health
Score**, budget math, reports) is pure-local and works in Expo Go and CI.

## Trade-offs

| Aspect      | On-device (FinPilot)                            |
| ----------- | ----------------------------------------------- |
| Privacy     | **Nothing leaves the device**                   |
| Cost        | Free after a one-time model download            |
| Quality     | Small quantized model (good for grounded chat)  |
| Multimodal  | OCR via ML Kit; the LLM is text-only            |
| Requires    | EAS dev build + a GGUF model file               |
