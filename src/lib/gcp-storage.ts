import { Storage } from "@google-cloud/storage";
import { v4 as uuidv4 } from "uuid";

let bucket: ReturnType<Storage["bucket"]> | undefined;

function getBucket() {
  if (bucket) return bucket;
  const encoded = process.env.GOOGLE_PRIVATE_KEY;
  const name = process.env.GOOGLE_CLOUD_BUCKET;
  if (!encoded) throw new Error("Missing GOOGLE_PRIVATE_KEY");
  if (!name) throw new Error("Missing GOOGLE_CLOUD_BUCKET");
  const credentials = JSON.parse(Buffer.from(encoded, "base64").toString());
  bucket = new Storage({ credentials }).bucket(name);
  return bucket;
}

export async function uploadToGCS(
  file: File,
  folder: string = "projects"
): Promise<{
  url: string;
  filename: string;
}> {
  try {
    console.log("Starting upload to GCS...");
    const fileBuffer = await file.arrayBuffer();
    const filename = `${folder}/${uuidv4()}-${file.name.replace(
      /[^a-zA-Z0-9.-]/g,
      "_"
    )}`;
    const bucket = getBucket();
    const blob = bucket.file(filename);

    console.log("Saving file to GCS...");
    await blob.save(Buffer.from(fileBuffer), {
      metadata: {
        contentType: file.type,
      },
    });

    console.log("File saved successfully");
    const publicUrl = `https://storage.googleapis.com/${bucket.name}/${filename}`;

    return {
      url: publicUrl,
      filename,
    };
  } catch (error) {
    console.error("Detailed upload error:", {
      error,
      bucket: process.env.GOOGLE_CLOUD_BUCKET,
    });
    throw error;
  }
}

export async function deleteFromGCS(filename: string): Promise<void> {
  try {
    await getBucket().file(filename).delete();
  } catch (error) {
    console.error("Error deleting from GCS:", error);
    throw error;
  }
}
