/**
 * OcrEngine — the on-device text-recognition seam.
 *
 * Receipt scanning is now **100% on-device**: an image is turned into raw text
 * by an `OcrEngine`, then a pure-TypeScript parser (`parseReceiptText` in
 * `@finpilot/finance-engine`) turns that text into structured fields. No bytes
 * ever leave the phone — there is no cloud vision call anywhere.
 *
 * Every backend implements the same `OcrEngine` interface, so the default
 * on-device engine, a fully-OSS alternative, and a deterministic test fake are
 * interchangeable.
 *
 * Implementations
 * ---------------
 *  - {@link MlKitOcrEngine}   — Google ML Kit on-device text recognition
 *    (`@react-native-ml-kit/text-recognition`). Runs entirely on the device; no
 *    network. This is the app default.
 *  - {@link FakeOcrEngine}    — returns canned text for unit tests / local dev.
 *
 * A fully open-source alternative (Tesseract, `react-native-tesseract-ocr`) can
 * be dropped in behind this same interface; see docs/on-device.md.
 *
 * Like the on-device LLM, the native OCR module contains native code that cannot
 * load in Node, Jest, or a standard Expo bundle, so it is **never statically
 * imported** — each call performs a guarded dynamic import and throws a clear,
 * actionable error when the lib is absent.
 */

export const OCR_UNAVAILABLE_MESSAGE =
  "on-device OCR requires an EAS dev build (native text-recognition module); see docs/on-device.md";

/** The pluggable on-device OCR backend. */
export interface OcrEngine {
  /** Identifier for logging, e.g. "ml-kit" | "fake". */
  readonly name: string;
  /**
   * Recognize all text in an image and return it as a single newline-joined
   * string (top-to-bottom). The string is then fed to the pure receipt parser.
   *
   * @param imageUri a local file URI (e.g. from expo-image-picker / camera).
   */
  recognize(imageUri: string): Promise<string>;
}

/**
 * Shape of the native module we rely on. `@react-native-ml-kit/text-recognition`
 * exposes a default object with `recognize(uri) => { text, blocks }`.
 */
interface MlKitModule {
  default?: { recognize(uri: string): Promise<{ text: string }> };
  recognize?(uri: string): Promise<{ text: string }>;
}

/**
 * On-device OCR backed by Google ML Kit text recognition. Runs locally on the
 * device with no network access. The native module is loaded lazily so merely
 * importing this file never requires the package (keeps Node tests + Expo
 * bundling working with zero native dependency declared here).
 */
export class MlKitOcrEngine implements OcrEngine {
  readonly name = "ml-kit";

  /** Lazily resolve the native module; throws the actionable error if absent. */
  private async load(): Promise<MlKitModule> {
    try {
      // Indirect specifier + dynamic import: never statically analyzable, so it
      // is only resolved when the lib is installed in a dev build.
      const specifier = "@react-native-ml-kit/text-recognition";
      const mod = (await import(/* webpackIgnore: true */ specifier)) as MlKitModule;
      return mod;
    } catch {
      throw new Error(OCR_UNAVAILABLE_MESSAGE);
    }
  }

  async recognize(imageUri: string): Promise<string> {
    const mod = await this.load();
    const api = mod.default ?? mod;
    if (!api.recognize) throw new Error(OCR_UNAVAILABLE_MESSAGE);
    const result = await api.recognize(imageUri);
    return result?.text ?? "";
  }
}

/** A deterministic OCR engine for tests / local dev. Returns canned text. */
export class FakeOcrEngine implements OcrEngine {
  readonly name = "fake";
  readonly calls: string[] = [];

  constructor(private readonly text = "FAKE STORE\nTOTAL 42.50\nGST 2.50\n2026-01-15") {}

  async recognize(imageUri: string): Promise<string> {
    this.calls.push(imageUri);
    return this.text;
  }
}

export type OcrEngineKind = "ml-kit";

/** Build an {@link OcrEngine}. The on-device ML Kit engine is the only kind. */
export function createOcrEngine(_kind: OcrEngineKind = "ml-kit"): OcrEngine {
  return new MlKitOcrEngine();
}
