import { createEveryQRCodeIdentity, type EveryQRCodeIdentity } from "./identity.js";
import { createQRSvgPath, type QRSvgPath } from "./qr-svg.js";
import type { IdentityScope } from "./url.js";

export type QRArtifact = {
  readonly identity: EveryQRCodeIdentity;
  readonly svg: QRSvgPath;
};

export async function createQRArtifact(
  url: string,
  identityScope: IdentityScope = "site",
): Promise<QRArtifact> {
  const identity = await createEveryQRCodeIdentity(url, { identityScope });
  return { identity, svg: createQRSvgPath(identity.qr) };
}
