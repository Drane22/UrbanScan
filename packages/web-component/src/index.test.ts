import { describe, expect, it } from "vitest";

import {
  CURRENT_GENERATOR_VERSION,
  defineEveryQRCodeElement,
  EVERY_QR_CODE_TAG,
  resolveEveryQRCodeModel,
} from "./index";

describe("defineEveryQRCodeElement", () => {
  it("is safe to import and call during server rendering", () => {
    expect(EVERY_QR_CODE_TAG).toBe("every-qr-code");
    expect(defineEveryQRCodeElement()).toBe(false);
  });

  it("publishes the generator version used by the element attribute", () => {
    expect(CURRENT_GENERATOR_VERSION).toBe(1);
  });

  it("accepts City while preserving Tree as the safe default", () => {
    expect(resolveEveryQRCodeModel("city")).toBe("city");
    expect(resolveEveryQRCodeModel("terrain")).toBe("terrain");
    expect(resolveEveryQRCodeModel("tree")).toBe("tree");
    expect(resolveEveryQRCodeModel("unknown")).toBe("tree");
    expect(resolveEveryQRCodeModel(null)).toBe("tree");
  });
});
