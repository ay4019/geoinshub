// Minimal TypeScript runner for project scripts (uses the jiti dependency already in node_modules).
// Usage: node scripts/run-ts.mjs scripts/verify-design-tools.ts
import { resolve } from "node:path";
import { pathToFileURL, fileURLToPath } from "node:url";

const root = resolve(fileURLToPath(new URL("..", import.meta.url)));
const { createJiti } = await import(pathToFileURL(resolve(root, "node_modules/jiti/lib/jiti.mjs")).href);
const jiti = createJiti(import.meta.url, { alias: { "@": root } });
await jiti.import(resolve(process.cwd(), process.argv[2]));
