const fs = require("fs");
const path = require("path");

const backendRoot = path.resolve(__dirname, "..");
const workspaceRoot = path.resolve(backendRoot, "..");

const configuredUploadsDir = process.env.UPLOADS_DIR?.trim();
const sharedUploadsDir = path.join(workspaceRoot, "uploads");
const backendUploadsDir = path.join(backendRoot, "uploads");

const uploadsRoot = configuredUploadsDir
  ? path.resolve(backendRoot, configuredUploadsDir)
  : fs.existsSync(sharedUploadsDir)
    ? sharedUploadsDir
    : backendUploadsDir;

function ensureUploadDir(...segments) {
  const targetDir = path.join(uploadsRoot, ...segments);
  fs.mkdirSync(targetDir, { recursive: true });
  return targetDir;
}

module.exports = {
  uploadsRoot,
  ensureUploadDir,
};
