import { spawnSync } from "node:child_process";

const result = spawnSync(
  process.execPath,
  ["scripts/run-framework.mjs", "build"],
  {
    stdio: "inherit",
    env: { ...process.env, MYFIT_STANDALONE: "1" },
  },
);

process.exit(result.status ?? 1);

