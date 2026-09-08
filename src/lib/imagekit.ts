import "server-only";

import ImageKit from "@imagekit/nodejs";
import { ALLOWED_IMAGE_TYPES, MAX_IMAGE_BYTES } from "@/lib/constants";

export class ImageKitConfigError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "ImageKitConfigError";
  }
}

function requiredEnv(name: string) {
  const value = process.env[name]?.trim();
  if (!value) {
    throw new ImageKitConfigError(
      `${name} is missing. Add ImageKit keys to .env and restart the server.`,
    );
  }
  return value;
}

let cached: ImageKit | null = null;

export function getImageKit() {
  if (cached) return cached;
  // Fail fast if endpoint is missing even though uploads use the private key API.
  requiredEnv("IMAGEKIT_URL_ENDPOINT");
  requiredEnv("IMAGEKIT_PUBLIC_KEY");
  cached = new ImageKit({
    privateKey: requiredEnv("IMAGEKIT_PRIVATE_KEY"),
  });
  return cached;
}

export function assertAllowedImage(file: {
  type: string;
  size: number;
  name?: string;
}) {
  if (
    !ALLOWED_IMAGE_TYPES.includes(
      file.type as (typeof ALLOWED_IMAGE_TYPES)[number],
    )
  ) {
    throw new Error("Use JPEG, PNG, WebP, or GIF images.");
  }
  if (file.size > MAX_IMAGE_BYTES) {
    throw new Error("Each image must be 5MB or smaller.");
  }
}

export async function uploadApplicationImage(input: {
  file: File;
  userId: string;
  applicationId: string;
}) {
  assertAllowedImage(input.file);
  const client = getImageKit();
  const folder = `/job-tracker/${input.userId}/${input.applicationId}`;
  const response = await client.files.upload({
    file: input.file,
    fileName: input.file.name || `screenshot-${Date.now()}.png`,
    folder,
    useUniqueFileName: true,
  });

  if (!response.fileId || !response.url) {
    throw new Error("ImageKit upload did not return a file URL.");
  }

  return {
    fileId: response.fileId,
    url: response.url,
    name: response.name ?? input.file.name,
    mimeType: input.file.type,
  };
}

export async function deleteImageKitFile(fileId: string) {
  const client = getImageKit();
  await client.files.delete(fileId);
}
