const multer = require("multer");
const env = require("../config/env");

const allowedMimeTypes = new Set(["image/jpeg", "image/png", "image/gif"]);
const maxBytes = env.maxFileSizeMb * 1024 * 1024;

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: maxBytes },
  fileFilter: (_req, file, cb) => {
    if (!allowedMimeTypes.has(file.mimetype)) {
      return cb(new Error("Only JPG, PNG, and GIF files are allowed"));
    }

    return cb(null, true);
  }
});

module.exports = {
  uploadSingle: upload.single("file")
};
