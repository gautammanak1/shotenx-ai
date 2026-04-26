import { spawn } from "node:child_process";

const children = [];

function run(name, script) {
  const isWindows = process.platform === "win32";
  const child = isWindows
    ? spawn("cmd.exe", ["/d", "/s", "/c", `npm run ${script}`], {
        stdio: "inherit",
        windowsVerbatimArguments: true
      })
    : spawn("npm", ["run", script], {
        stdio: "inherit"
      });

  children.push(child);

  child.on("error", (error) => {
    console.error(`[dev:all] ${name} failed to start: ${error.message}`);
    shutdown(1);
  });

  child.on("exit", (code) => {
    if (code !== 0) {
      console.error(`[dev:all] ${name} exited with code ${code ?? "null"}`);
      shutdown(1);
    }
  });
}

function shutdown(exitCode = 0) {
  for (const child of children) {
    if (!child.killed) {
      child.kill("SIGINT");
    }
  }
  setTimeout(() => process.exit(exitCode), 300);
}

process.on("SIGINT", () => shutdown(0));
process.on("SIGTERM", () => shutdown(0));

console.info("[dev:all] Starting Resume API/UI on :3000 and A2A agent on :41242");
run("resume", "dev");
run("a2a", "dev:a2a");
