/**
 * FlowState Bot — Cloudflare R2 uploader.
 *
 * Uses the S3-compatible API exposed by R2.
 * Returns a public URL for the uploaded file.
 */

import { randomUUID } from 'node:crypto';

import { PutObjectCommand, S3Client } from '@aws-sdk/client-s3';

const r2 = new S3Client({
  region: 'auto',
  endpoint: `https://${process.env.CLOUDFLARE_R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
  credentials: {
    accessKeyId: process.env.CLOUDFLARE_R2_ACCESS_KEY_ID ?? '',
    secretAccessKey: process.env.CLOUDFLARE_R2_SECRET_ACCESS_KEY ?? '',
  },
});

const BUCKET = process.env.CLOUDFLARE_R2_BUCKET_NAME ?? 'flowstate-checkins';

/**
 * Upload a Buffer to R2 and return the public URL.
 * Files are stored as: checkins/{clientId}/{uuid}.{ext}
 */
export async function uploadCheckInPhoto(
  clientId: string,
  buffer: Buffer,
  mimeType: string
): Promise<string> {
  const ext = mimeType.split('/')[1] ?? 'jpg';
  const key = `checkins/${clientId}/${randomUUID()}.${ext}`;

  await r2.send(
    new PutObjectCommand({
      Bucket: BUCKET,
      Key: key,
      Body: buffer,
      ContentType: mimeType,
    })
  );

  // R2 public URL format (requires public bucket or custom domain)
  const baseUrl =
    process.env.CLOUDFLARE_R2_PUBLIC_URL ??
    `https://pub-${process.env.CLOUDFLARE_R2_ACCOUNT_ID}.r2.dev`;

  return `${baseUrl}/${key}`;
}
