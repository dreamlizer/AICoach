import fs from "fs";
import path from "path";

const args = process.argv.slice(2);

const getArgValue = (flag) => {
  const index = args.indexOf(flag);
  if (index === -1 || index + 1 >= args.length) return "";
  return String(args[index + 1] || "").trim();
};

const sourceArg = getArgValue("--source");
const targetArg = getArgValue("--target");

if (!sourceArg || !targetArg) {
  console.error("Usage: node scripts/backup-sqlite.mjs --source <sqlite-file-path> --target <backup-file-path>");
  process.exit(1);
}

const sourcePath = path.resolve(sourceArg);
const targetPath = path.resolve(targetArg);

if (sourcePath === targetPath) {
  console.error("Error: source and target path must be different.");
  process.exit(1);
}

if (!fs.existsSync(sourcePath)) {
  console.error(`Error: source file does not exist: ${sourcePath}`);
  process.exit(1);
}

const sourceStat = fs.statSync(sourcePath);
if (!sourceStat.isFile()) {
  console.error(`Error: source path is not a file: ${sourcePath}`);
  process.exit(1);
}

if (fs.existsSync(targetPath)) {
  console.error(`Error: target file already exists, refusing to overwrite: ${targetPath}`);
  process.exit(1);
}

fs.mkdirSync(path.dirname(targetPath), { recursive: true });
fs.copyFileSync(sourcePath, targetPath, fs.constants.COPYFILE_EXCL);

const backupStat = fs.statSync(targetPath);
if (backupStat.size !== sourceStat.size) {
  console.error(`Error: backup size mismatch. source=${sourceStat.size}, target=${backupStat.size}`);
  process.exit(1);
}

console.info(`[backup-sqlite] source=${sourcePath}`);
console.info(`[backup-sqlite] target=${targetPath}`);
console.info(`[backup-sqlite] size=${backupStat.size} bytes`);
