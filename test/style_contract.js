const fs = require("node:fs");
const path = require("node:path");

const root = process.cwd();

const read = (relPath) => fs.readFileSync(path.join(root, relPath), "utf8");
const exists = (relPath) => fs.existsSync(path.join(root, relPath));
const escapeRegExp = (value) => value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

// Load registered overrides from .al-folio-overrides.yml (simple YAML parsing)
const overridePaths = new Set();
const overridesFile = path.join(root, ".al-folio-overrides.yml");
if (fs.existsSync(overridesFile)) {
  const overridesContent = fs.readFileSync(overridesFile, "utf8");
  // Extract paths from lines matching "  - path: <value>" (array format)
  for (const match of overridesContent.matchAll(/^\s+-\s+path:\s+(.+)$/gm)) {
    overridePaths.add(match[1].trim());
  }
  // Extract paths from keys of the hash format (e.g. "  _includes/cv/render.liquid:")
  // We look for lines under "overrides:" that start with two spaces and end with ":"
  let inOverridesBlock = false;
  for (const line of overridesContent.split(/\r?\n/)) {
    if (/^overrides:\s*$/.test(line)) {
      inOverridesBlock = true;
      continue;
    }
    if (inOverridesBlock) {
      if (line.trim() === "" || line.startsWith("#")) continue;
      if (/^\S/.test(line)) {
        // Line with no leading spaces means we left the overrides block
        inOverridesBlock = false;
        continue;
      }
      const hashMatch = line.match(/^  ([a-zA-Z0-9_\-\./]+):\s*$/);
      if (hashMatch) {
        overridePaths.add(hashMatch[1].trim());
      }
    }
  }
}

// Recursively list all files under a directory (relative to root)
const listFilesRecursive = (dirRelPath) => {
  const files = [];
  const absDir = path.join(root, dirRelPath);
  if (!fs.existsSync(absDir) || !fs.statSync(absDir).isDirectory()) return files;
  const entries = fs.readdirSync(absDir, { withFileTypes: true });
  for (const entry of entries) {
    const rel = path.posix.join(dirRelPath, entry.name);
    if (entry.isDirectory()) {
      files.push(...listFilesRecursive(rel));
    } else {
      files.push(rel);
    }
  }
  return files;
};

const failures = [];

const packageJson = JSON.parse(read("package.json"));
const scripts = packageJson.scripts || {};
for (const forbiddenScript of ["build:css", "build:tailwind", "build:tailwind:watch"]) {
  if (Object.prototype.hasOwnProperty.call(scripts, forbiddenScript)) {
    failures.push(`Starter package.json must not define \`${forbiddenScript}\`; build ownership belongs to gem repos.`);
  }
}

const config = read("_config.yml");
if (!/^\s*theme:\s*al_folio_core\s*$/m.test(config)) {
  failures.push("`_config.yml` must keep `theme: al_folio_core` for thin-starter wiring.");
}
if (!/^\s*-\s*al_folio_core\s*$/m.test(config)) {
  failures.push("`_config.yml` plugins must include `al_folio_core`.");
}
if (!/^\s*-\s*al_folio_distill\s*$/m.test(config)) {
  failures.push("`_config.yml` plugins must include `al_folio_distill` (distill is plugin-owned).");
}
if (!/^\s*-\s*al_cookie\s*$/m.test(config)) {
  failures.push("`_config.yml` plugins must include `al_cookie` (cookie consent is plugin-owned).");
}
if (!/^\s*-\s*al_icons\s*$/m.test(config)) {
  failures.push("`_config.yml` plugins must include `al_icons` (icon runtime is plugin-owned).");
}
if (!/^\s*-\s*al_math\s*$/m.test(config)) {
  failures.push("`_config.yml` plugins must include `al_math` when math features are enabled.");
}

for (const libraryKey of ["fontawesome", "academicons", "scholar-icons"]) {
  if (!new RegExp(`^\\s{2}${escapeRegExp(libraryKey)}:\\s*$`, "m").test(config)) {
    failures.push(`\`_config.yml\` must define \`third_party_libraries.${libraryKey}\` for al_icons runtime wiring.`);
    continue;
  }
  if (!new RegExp(`^\\s{2}${escapeRegExp(libraryKey)}:[\\s\\S]*?^\\s{4}integrity:\\s*$[\\s\\S]*?^\\s{6}css:\\s*\"sha`, "m").test(config)) {
    failures.push(`\`_config.yml\` should define an SRI hash for \`third_party_libraries.${libraryKey}.integrity.css\`.`);
  }
}

for (const libraryKey of ["tikzjax", "tocbot"]) {
  if (!new RegExp(`^\\s{2}${escapeRegExp(libraryKey)}:\\s*$`, "m").test(config)) {
    failures.push(`\`_config.yml\` must define \`third_party_libraries.${libraryKey}\` for v1 runtime contracts.`);
  }
}

const gemfile = read("Gemfile");
if (!/gem 'al_math', '= 1\.0\.1'/.test(gemfile)) {
  failures.push("`Gemfile` should pin `al_math` to released version `1.0.1`.");
}
if (/gem 'al_math',\s*:git =>/.test(gemfile)) {
  failures.push("`Gemfile` must not use git-branch pin for `al_math`; use released gem version.");
}

for (const forbiddenPath of ["_includes", "_layouts", "_sass", "_scripts", "assets/tailwind", "tailwind.config.js", "assets/webfonts"]) {
  if (exists(forbiddenPath)) {
    // If every file under this path is a registered override, allow it
    const absPath = path.join(root, forbiddenPath);
    if (fs.statSync(absPath).isDirectory()) {
      const allFiles = listFilesRecursive(forbiddenPath);
      // Normalize to forward slashes for comparison
      const unregistered = allFiles.filter((f) => !overridePaths.has(f.replace(/\\/g, "/")));
      if (unregistered.length > 0) {
        failures.push(
          `Starter must not own core component path \`${forbiddenPath}\`; move ownership to the corresponding gem. Unregistered files: ${unregistered.join(", ")}`
        );
      }
    } else if (!overridePaths.has(forbiddenPath)) {
      failures.push(`Starter must not own core component path \`${forbiddenPath}\`; move ownership to the corresponding gem.`);
    }
  }
}

for (const forbiddenGlobPath of [
  "assets/fonts/academicons.woff",
  "assets/fonts/academicons.ttf",
  "assets/fonts/scholar-icons.woff",
  "assets/fonts/scholar-icons.ttf",
]) {
  if (exists(forbiddenGlobPath)) {
    failures.push(`Starter must not own icon runtime artifact \`${forbiddenGlobPath}\`; icon ownership belongs to al_icons.`);
  }
}

for (const requiredPath of ["test/visual", "test/integration_plugin_toggles.sh", "test/integration_distill.sh"]) {
  if (!exists(requiredPath)) {
    failures.push(`Starter integration/visual contract missing required path: \`${requiredPath}\`.`);
  }
}

if (failures.length > 0) {
  console.error("Starter style contract check failed:");
  failures.forEach((message) => console.error(`- ${message}`));
  process.exit(1);
}

console.log("Starter style contract check passed.");
