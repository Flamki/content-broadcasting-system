const fs = require("fs");
const path = require("path");
const { randomUUID } = require("crypto");
const { S3Client, PutObjectCommand } = require("@aws-sdk/client-s3");
const env = require("../config/env");
const ApiError = require("../utils/api-error");
const { normalizeSubject } = require("../utils/subject");

const uploadDir = path.join(process.cwd(), "uploads");
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

const fileExtByMime = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/gif": "gif"
};

let s3Client = null;

function getS3Client() {
  if (s3Client) {
    return s3Client;
  }

  if (!env.s3Region || !env.s3Bucket || !env.s3AccessKeyId || !env.s3SecretAccessKey) {
    throw new ApiError(
      500,
      "S3 is enabled but required S3 env values are missing (region, bucket, access key, secret key)"
    );
  }

  s3Client = new S3Client({
    region: env.s3Region,
    endpoint: env.s3Endpoint || undefined,
    forcePathStyle: env.s3ForcePathStyle,
    credentials: {
      accessKeyId: env.s3AccessKeyId,
      secretAccessKey: env.s3SecretAccessKey
    }
  });

  return s3Client;
}

function buildS3PublicUrl(key) {
  if (env.s3PublicBaseUrl) {
    return `${env.s3PublicBaseUrl.replace(/\/+$/, "")}/${key}`;
  }

  if (env.s3Endpoint) {
    return `${env.s3Endpoint.replace(/\/+$/, "")}/${env.s3Bucket}/${key}`;
  }

  return `https://${env.s3Bucket}.s3.${env.s3Region}.amazonaws.com/${key}`;
}

function makeStorageFileName(originalName, mimeType) {
  const ext = fileExtByMime[mimeType] || "bin";
  const base = (originalName || "upload")
    .toLowerCase()
    .replace(/[^a-z0-9._-]/g, "-")
    .replace(/-+/g, "-")
    .replace(/\.+/g, ".")
    .replace(/^-+|-+$/g, "");
  const safeBase = base && base !== "." ? base : "upload";
  const noExt = safeBase.replace(/\.[a-z0-9]+$/i, "");
  return `${noExt}-${Date.now()}-${randomUUID().slice(0, 8)}.${ext}`;
}

async function storeToLocal(file, teacherId, subject) {
  const normalizedSubject = normalizeSubject(subject) || "general";
  const fileName = makeStorageFileName(file.originalname, file.mimetype);
  const teacherSegment = `teacher-${teacherId}`;
  const relativeDir = path.join(teacherSegment, normalizedSubject);
  const absoluteDir = path.join(uploadDir, relativeDir);

  await fs.promises.mkdir(absoluteDir, { recursive: true });
  const absolutePath = path.join(absoluteDir, fileName);
  await fs.promises.writeFile(absolutePath, file.buffer);

  const posixPath = path.posix.join("/uploads", relativeDir.replace(/\\/g, "/"), fileName);
  return posixPath;
}

async function storeToS3(file, teacherId, subject) {
  const client = getS3Client();
  const normalizedSubject = normalizeSubject(subject) || "general";
  const fileName = makeStorageFileName(file.originalname, file.mimetype);
  const key = `content/teacher-${teacherId}/${normalizedSubject}/${fileName}`;

  await client.send(
    new PutObjectCommand({
      Bucket: env.s3Bucket,
      Key: key,
      Body: file.buffer,
      ContentType: file.mimetype
    })
  );

  return buildS3PublicUrl(key);
}

async function storeUpload(file, teacherId, subject) {
  if (!file || !file.buffer) {
    throw new ApiError(400, "Uploaded file payload is invalid");
  }

  if (env.storageDriver === "s3") {
    return storeToS3(file, teacherId, subject);
  }

  return storeToLocal(file, teacherId, subject);
}

module.exports = {
  storeUpload
};
