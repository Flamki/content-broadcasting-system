# S3 Setup Guide (Demo Ready)

This guide configures S3 for the backend upload flow (`STORAGE_DRIVER=s3`).

## 1) Create Bucket

- Region: same as your backend deployment region (recommended).
- Suggested name: `content-broadcasting-system-<your-suffix>`.
- Keep **Block all public access = ON** initially while creating.

## 2) Enable Public Read for Uploaded Objects (Demo Mode)

If you want uploaded files directly viewable in browser for demo:

1. Open S3 bucket -> **Permissions**.
2. Edit **Block public access** and disable block options for this bucket.
3. Apply bucket policy from:
   - `docs/s3-bucket-policy-public-read.json`
4. Replace `YOUR_BUCKET_NAME` in that JSON before saving.

## 3) Configure CORS

Apply CORS from:
- `docs/s3-cors.json`

If you have a frontend URL, replace `*` with specific origins.

## 4) IAM User Permissions

Use an IAM user with only these actions on this bucket:
- `s3:PutObject`
- `s3:GetObject`
- `s3:ListBucket` (optional but useful)

Do not use root credentials.

## 5) Backend .env

Set:

```env
STORAGE_DRIVER=s3
S3_REGION=ap-south-1
S3_BUCKET=YOUR_BUCKET_NAME
S3_ACCESS_KEY_ID=YOUR_ACCESS_KEY
S3_SECRET_ACCESS_KEY=YOUR_SECRET_KEY
S3_ENDPOINT=
S3_PUBLIC_BASE_URL=
S3_FORCE_PATH_STYLE=false
```

Notes:
- Keep `S3_ENDPOINT` empty for AWS S3.
- Use `S3_PUBLIC_BASE_URL` only if serving through CDN/custom domain.

## 6) Verify

1. Start API.
2. Login as teacher.
3. Upload image via `POST /api/content/upload`.
4. Confirm `filePath` in response is an S3 URL.
5. Open URL in browser to verify object access.

## 7) Production Recommendation

For production, avoid public-read bucket policy and use:
- private bucket
- CloudFront signed URLs or backend-generated presigned URLs
