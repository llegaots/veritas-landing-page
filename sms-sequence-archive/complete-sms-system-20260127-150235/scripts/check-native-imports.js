#!/usr/bin/env node

/**
 * Build-time check to prevent static better-sqlite3 imports
 * 
 * This script runs before builds to catch any static imports
 * that would cause Vercel build failures.
 */

const fs = require("fs");
const path = require("path");

const ROOTS = ["app", "pages", "lib", "src"];
const BAD = [
  /from\s+["']better-sqlite3["']/,
  /require\(["']better-sqlite3["']\)/,
  /import\s+.*\s+from\s+["']better-sqlite3["']/,
];

function walk(dir) {
  if (!fs.existsSync(dir)) return [];
  const out = [];
  for (const entry of fs.readdirSync(dir)) {
    const p = path.join(dir, entry);
    const st = fs.statSync(p);
    if (st.isDirectory()) {
      // Skip node_modules and .next
      if (entry === 'node_modules' || entry === '.next' || entry === '.git') {
        continue;
      }
      out.push(...walk(p));
    } else if (p.endsWith(".ts") || p.endsWith(".tsx") || p.endsWith(".js") || p.endsWith(".jsx")) {
      out.push(p);
    }
  }
  return out;
}

const files = ROOTS.flatMap((root) => {
  const fullPath = path.join(process.cwd(), root);
  return walk(fullPath);
});

const offenders = [];

for (const f of files) {
  try {
    const txt = fs.readFileSync(f, "utf8");
    for (const pattern of BAD) {
      if (pattern.test(txt)) {
        // Check if it's in a comment or string (false positive)
        const lines = txt.split('\n');
        lines.forEach((line, idx) => {
          if (pattern.test(line)) {
            // Simple check: if it's not in a comment
            const trimmed = line.trim();
            if (!trimmed.startsWith('//') && !trimmed.startsWith('*')) {
              offenders.push({
                file: f,
                line: idx + 1,
                content: trimmed.substring(0, 100),
              });
            }
          }
        });
      }
    }
  } catch (error) {
    console.warn(`Warning: Could not read ${f}:`, error.message);
  }
}

if (offenders.length) {
  console.error("\n❌ Static better-sqlite3 imports found:\n");
  offenders.forEach(({ file, line, content }) => {
    console.error(`  ${file}:${line}`);
    console.error(`    ${content}`);
  });
  console.error("\n💡 Fix: Use dynamic import in lib/sqlite.ts instead");
  console.error("   Example: const mod = await import('better-sqlite3');\n");
  process.exit(1);
}

console.log("✅ No static better-sqlite3 imports found");

