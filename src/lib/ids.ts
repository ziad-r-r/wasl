import { randomBytes, createHash } from "crypto";

export function id() {
  return randomBytes(12).toString("hex");
}

export function token() {
  return randomBytes(32).toString("hex");
}

export function hashToken(value: string) {
  return createHash("sha256").update(value).digest("hex");
}
