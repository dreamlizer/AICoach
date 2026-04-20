import { spawnSync } from "child_process";
import path from "path";
import { fileURLToPath } from "url";

const mode = process.argv[2] || "build";
const nextArgs = mode === "start" ? ["start"] : ["build"];
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const nextBin = process.platform === "win32"
  ? path.resolve(__dirname, "..", "node_modules", ".bin", "next.cmd")
  : path.resolve(__dirname, "..", "node_modules", ".bin", "next");

process.title = "DreamLab";

function quoteArg(arg) {
  if (!/[ \t"]/u.test(arg)) return arg;
  return `"${arg.replace(/"/g, '\\"')}"`;
}

const result =
  process.platform === "win32" && mode === "start"
    ? spawnSync(
        "cmd.exe",
        ["/d", "/s", "/c", `title DreamLab && ${[quoteArg(nextBin), ...nextArgs.map(quoteArg)].join(" ")}`],
        {
          stdio: "inherit",
          shell: false,
          env: {
            ...process.env,
            NEXT_DIST_DIR: ".next-build",
          },
        }
      )
    : spawnSync(nextBin, nextArgs, {
        stdio: "inherit",
        shell: process.platform === "win32",
        env: {
          ...process.env,
          NEXT_DIST_DIR: ".next-build",
        },
      });

if (result.error) {
  console.error(result.error);
}

process.exit(result.status ?? 1);
