import { execFile } from "node:child_process";
import { promisify } from "node:util";

const execFileAsync = promisify(execFile);

const parseJson = (raw: string): Record<string, unknown> => {
  const trimmed = raw.trim();
  if (!trimmed) {
    throw new Error("Wallet command returned empty output");
  }

  try {
    return JSON.parse(trimmed) as Record<string, unknown>;
  } catch {
    const lines = trimmed.split("\n").map((line) => line.trim()).filter(Boolean);
    for (const line of lines.reverse()) {
      try {
        return JSON.parse(line) as Record<string, unknown>;
      } catch {
        continue;
      }
    }
    throw new Error("Wallet command output is not valid JSON");
  }
};

const pickPreimage = (payload: Record<string, unknown>) => {
  const candidates = [
    payload.preimage,
    payload.payment_preimage,
    payload.paymentPreimage,
    payload.secret
  ];
  for (const value of candidates) {
    if (typeof value === "string" && value.trim()) {
      return value.trim();
    }
  }
  return "";
};

export const autoPayInvoiceWithAgentWallet = async (invoice: string) => {
  const customCommand = process.env.MDK_WALLET_AUTO_PAY_COMMAND?.trim();

  const commandParts = customCommand
    ? customCommand.split(" ").filter(Boolean)
    : ["npx", "@moneydevkit/agent-wallet@latest", "send", invoice];

  const bin = commandParts[0];
  const args = commandParts.slice(1);

  const { stdout, stderr } = await execFileAsync(bin, args, {
    timeout: 120000,
    env: process.env
  });

  const payload = parseJson(stdout);
  const preimage = pickPreimage(payload);

  if (!preimage) {
    throw new Error(
      "Auto-pay succeeded but no preimage returned. Use manual payment fallback or configure MDK_WALLET_AUTO_PAY_COMMAND to return a preimage."
    );
  }

  return {
    preimage,
    raw: payload
  };
};
