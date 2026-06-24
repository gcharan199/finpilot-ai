# On-device AI

`@finpilot/ai-engine` ships an `OnDeviceProvider` that runs an LLM **locally on the phone** —
no network, no API key, full privacy for sensitive financial data. It is intentionally **not**
wired up by default, because on-device inference needs a native module + a downloaded model that
only exist inside a real device build.

## Why it is a dynamic import

The native LLM library (e.g. [`react-native-ai`](https://github.com/callstackincubator/ai) or
[`llama.rn`](https://github.com/mybigday/llama.rn)) contains native code that **cannot** be
imported in Node, in Jest, or during Metro/Expo bundling for a non-dev client. So
`OnDeviceProvider` never `import`s it statically. Instead, at call time it does:

```ts
const mod = await import("react-native-ai"); // resolved only when the lib is installed
```

inside a `try`/`catch`. If the lib is absent it throws a clear, actionable error:

> on-device AI requires an EAS dev build + an on-device model; see docs/on-device.md

This keeps `pnpm install`, Node unit tests, and standard Expo bundles working with **no native
dependency** in `package.json`.

## Enabling it (in the mobile app, later)

1. Create an **EAS dev build** (the native lib cannot run in Expo Go).

   ```bash
   npx expo install react-native-ai   # or llama.rn
   eas build --profile development --platform ios   # or android
   ```

2. Download / bundle a quantized model (e.g. a GGUF Llama-3.2-1B-Instruct) and point the provider
   at it via `createProvider("on-device", { modelPath })`.

3. The provider then satisfies the same `AIProvider` interface as Gemini, so the app code is
   identical regardless of which backend is selected.

## Trade-offs

| Aspect      | Gemini (cloud)             | On-device                          |
| ----------- | -------------------------- | ---------------------------------- |
| Privacy     | Data leaves device         | Never leaves device                |
| Cost        | Per-token API cost         | Free after model download          |
| Quality     | Frontier model             | Small quantized model              |
| Multimodal  | Yes (receipt OCR)          | Limited / text-only on most builds |
| Requires    | API key + network          | EAS dev build + model file         |
