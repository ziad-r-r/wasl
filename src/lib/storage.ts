import fs from "fs";
import path from "path";

const IMAGE = new Set(["image/jpeg", "image/png", "image/webp", "image/gif"]);
const VIDEO = new Set(["video/mp4", "video/webm"]);
const AUDIO = new Set(["audio/webm", "audio/mpeg", "audio/wav", "audio/mp4", "audio/ogg"]);

export function classify(type: string) {
  if (IMAGE.has(type)) return "image";
  if (VIDEO.has(type)) return "video";
  if (AUDIO.has(type)) return "audio";
  return null;
}

export async function storeUpload(file: File) {
  const kind = classify(file.type);
  if (!kind) {
    const err = new Error("Unsupported file type");
    (err as Error & { status?: number }).status = 400;
    throw err;
  }
  const max = kind === "video" ? 40 * 1024 * 1024 : 8 * 1024 * 1024;
  if (file.size > max) {
    const err = new Error("File is too large");
    (err as Error & { status?: number }).status = 400;
    throw err;
  }
  const ext = file.name.includes(".") ? file.name.slice(file.name.lastIndexOf(".")).toLowerCase().replace(/[^.a-z0-9]/g, "") : "";
  const key = `${Date.now()}-${Math.random().toString(16).slice(2)}${ext || ".bin"}`;
  const buf = Buffer.from(await file.arrayBuffer());
  if (process.env.S3_BUCKET && process.env.S3_ACCESS_KEY && process.env.S3_SECRET_KEY) {
    const { S3Client, PutObjectCommand } = await import("@aws-sdk/client-s3");
    const client = new S3Client({
      region: process.env.S3_REGION || "auto",
      endpoint: process.env.S3_ENDPOINT || undefined,
      credentials: { accessKeyId: process.env.S3_ACCESS_KEY, secretAccessKey: process.env.S3_SECRET_KEY },
      forcePathStyle: true
    });
    await client.send(new PutObjectCommand({ Bucket: process.env.S3_BUCKET, Key: key, Body: buf, ContentType: file.type }));
    const base = process.env.S3_PUBLIC_BASE || `${process.env.S3_ENDPOINT}/${process.env.S3_BUCKET}`;
    return { url: `${base.replace(/\/$/, "")}/${key}`, mediaType: kind };
  }
  const dir = path.join(process.cwd(), "public/uploads");
  fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(path.join(dir, key), buf);
  return { url: `/uploads/${key}`, mediaType: kind };
}
