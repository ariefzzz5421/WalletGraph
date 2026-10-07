import { hashPassword } from "../src/lib/security";

async function readSecret() {
  if (!process.stdin.isTTY || !process.stdin.setRawMode) {
    throw new Error("Run this command in an interactive terminal");
  }
  process.stdout.write("Site password: ");
  process.stdin.setRawMode(true);
  process.stdin.resume();
  let value = "";
  try {
    for await (const chunk of process.stdin) {
      for (const character of String(chunk)) {
        if (character === "\r" || character === "\n") {
          process.stdout.write("\n");
          return value;
        }
        if (character === "\u0003") throw new Error("Cancelled");
        if (character === "\u007f" || character === "\b") value = value.slice(0, -1);
        else if (character >= " " && character !== "\u007f") value += character;
      }
    }
    throw new Error("No password received");
  } finally {
    process.stdin.setRawMode(false);
    process.stdin.pause();
  }
}

async function main() {
  const password = await readSecret();
  if (!password) throw new Error("Password cannot be empty");
  process.stdout.write(`${await hashPassword(password)}\n`);
}

main().catch(error => {
  console.error(error instanceof Error ? error.message : "Could not generate password hash");
  process.exitCode = 1;
});
