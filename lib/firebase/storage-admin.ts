import { adminStorage } from "./admin";

const BUCKET_NAME = process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET;
const bucket = BUCKET_NAME ? adminStorage.bucket(BUCKET_NAME) : adminStorage.bucket();

/**
 * Upload a file (image) to Firebase Storage and return the public download URL.
 * @param file - The File or Blob to upload
 * @param folder - Folder path inside the bucket (e.g., "Turf/<turfName>")
 * @param filename - The filename (e.g., "image.jpg")
 * @returns Public HTTPS URL of the uploaded file
 */
export async function uploadFileToStorage(
  file: File | Blob,
  folder: string,
  filename: string,
): Promise<string> {
  const buffer = Buffer.from(await file.arrayBuffer());
  const safeName = filename.replace(/[^a-zA-Z0-9._-]/g, "_");
  const safeFolder = folder.replace(/[^a-zA-Z0-9._/-]/g, "_").replace(/\/+/g, "/");
  const fullPath = `${safeFolder}/${Date.now()}_${safeName}`;

  const fileRef = bucket.file(fullPath);
  await fileRef.save(buffer, {
    contentType: file.type || "image/jpeg",
    metadata: {
      cacheControl: "public, max-age=31536000, immutable",
    },
    resumable: false,
  });

  // Generate a long-lived public download URL
  const [url] = await fileRef.getSignedUrl({
    action: "read",
    expires: "12-31-2099",
  });

  return url;
}

/**
 * Delete a file from Firebase Storage by its public URL or storage path.
 * Best-effort — errors are logged but not thrown.
 */
export async function deleteFileFromStorage(urlOrPath: string): Promise<void> {
  try {
    if (!urlOrPath) return;
    // Extract the object path from a Firebase Storage URL
    // URLs look like: https://firebasestorage.googleapis.com/v0/b/{bucket}/o/{path}?...
    let path = urlOrPath;
    try {
      const u = new URL(urlOrPath);
      const match = u.pathname.match(/\/o\/(.+)$/);
      if (match) path = decodeURIComponent(match[1]);
    } catch {
      // Not a URL — treat as raw path
    }
    if (BUCKET_NAME && path.startsWith(`${BUCKET_NAME}/`)) {
      path = path.slice(BUCKET_NAME.length + 1);
    }
    await bucket.file(path).delete({ ignoreNotFound: true });
  } catch (err) {
    console.warn("[storage] Failed to delete file:", err);
  }
}
