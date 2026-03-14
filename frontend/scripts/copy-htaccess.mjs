import { copyFileSync, existsSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const frontendRoot = path.resolve(scriptDir, "..");
const source = path.join(frontendRoot, "public", ".htaccess");
const target = path.join(frontendRoot, "dist", ".htaccess");

if (existsSync(source)) {
  copyFileSync(source, target);
}
