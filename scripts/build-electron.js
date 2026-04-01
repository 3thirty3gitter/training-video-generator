/**
 * build-electron.js
 * 
 * Builds the Electron app for Windows:
 * 1. Builds Next.js production
 * 2. Packages with electron-packager (pruning dev deps)
 * 3. Copies Puppeteer's Chromium into the package
 * 4. Cleans up unnecessary files to reduce size
 */

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const OUT_DIR = 'dist-electron';
const APP_NAME = 'Training Video Generator';
const PACKAGED_DIR = 'TVG-win32-x64'; // Short name to avoid Windows MAX_PATH (260 char) limit
const APP_DIR = path.join(OUT_DIR, PACKAGED_DIR);
const RESOURCES_APP = path.join(APP_DIR, 'resources', 'app');

function run(cmd, label) {
  console.log(`\n=== ${label} ===`);
  console.log(`> ${cmd}\n`);
  execSync(cmd, { stdio: 'inherit', shell: true });
}

function rmDir(dir) {
  if (fs.existsSync(dir)) {
    fs.rmSync(dir, { recursive: true, force: true });
    console.log(`  Removed: ${dir}`);
  }
}

function getDirSizeMB(dir) {
  let total = 0;
  if (!fs.existsSync(dir)) return 0;
  const walk = (d) => {
    for (const entry of fs.readdirSync(d, { withFileTypes: true })) {
      const full = path.join(d, entry.name);
      if (entry.isDirectory()) walk(full);
      else total += fs.statSync(full).size;
    }
  };
  walk(dir);
  return (total / (1024 * 1024)).toFixed(0);
}

function copyDirSync(src, dest) {
  fs.mkdirSync(dest, { recursive: true });
  for (const entry of fs.readdirSync(src, { withFileTypes: true })) {
    const srcPath = path.join(src, entry.name);
    const destPath = path.join(dest, entry.name);
    if (entry.isDirectory()) {
      copyDirSync(srcPath, destPath);
    } else {
      fs.copyFileSync(srcPath, destPath);
    }
  }
}

// ─── Step 1: Clean & Build Next.js ──────────────────────────────────
run('npx rimraf .next', 'Cleaning .next');
run('npm run build', 'Building Next.js production');

// Verify BUILD_ID
if (!fs.existsSync('.next/BUILD_ID')) {
  console.error('ERROR: .next/BUILD_ID not found after build!');
  process.exit(1);
}
console.log('  BUILD_ID:', fs.readFileSync('.next/BUILD_ID', 'utf8').trim());

// ─── Step 2: Package with electron-packager ─────────────────────────
const ignorePattern = 'dist-electron|\\.next[\\\\/]cache|\\.git$|\\.puppeteer_data|\\.puppeteer_session|wizard_debug\\.log|temp_stitch';
run(
  `npx electron-packager . "${APP_NAME}" --platform=win32 --arch=x64 --out=${OUT_DIR} --overwrite --ignore="${ignorePattern}" --prune=true --icon=public/icon.ico`,
  'Packaging with electron-packager'
);

// Rename from default long name to short name for Windows MAX_PATH compatibility
const defaultDir = path.join(OUT_DIR, `${APP_NAME}-win32-x64`);
if (defaultDir !== APP_DIR && fs.existsSync(defaultDir)) {
  if (fs.existsSync(APP_DIR)) fs.rmSync(APP_DIR, { recursive: true, force: true });
  fs.renameSync(defaultDir, APP_DIR);
  console.log(`  Renamed to ${PACKAGED_DIR} for shorter paths`);
}

// ─── Step 3: Remove unnecessary files from package ──────────────────
console.log('\n=== Cleaning packaged node_modules ===');
const nm = path.join(RESOURCES_APP, 'node_modules');

// Dev-only packages that electron-packager --prune may miss
const devOnlyDirs = [
  'electron', 'electron-builder', 'electron-packager', '@electron-forge',
  'app-builder-bin', 'app-builder-lib', 'dmg-builder', '7zip-bin',
  'concurrently', 'wait-on', 'typescript', '@types',
  'autoprefixer', 'postcss', 'tailwindcss', 'prettier',
  // Build tools
  'electron-rebuild', '@electron', 'builder-util', 'builder-util-runtime',
];

let savedMB = 0;
for (const dir of devOnlyDirs) {
  const full = path.join(nm, dir);
  if (fs.existsSync(full)) {
    const size = getDirSizeMB(full);
    rmDir(full);
    savedMB += parseInt(size);
  }
}

// Remove test/docs/example dirs from all remaining packages
let cleanedCount = 0;
const cleanPatterns = ['test', 'tests', '__tests__', 'docs', 'doc', 'example', 'examples', '.github'];
function cleanNodeModules(baseDir) {
  if (!fs.existsSync(baseDir)) return;
  for (const entry of fs.readdirSync(baseDir, { withFileTypes: true })) {
    const full = path.join(baseDir, entry.name);
    if (entry.isDirectory()) {
      if (entry.name === 'node_modules') {
        cleanNodeModules(full);
      } else if (cleanPatterns.includes(entry.name)) {
        rmDir(full);
        cleanedCount++;
      } else if (entry.name.startsWith('@')) {
        // Scoped packages
        for (const sub of fs.readdirSync(full, { withFileTypes: true })) {
          if (sub.isDirectory()) {
            for (const pattern of cleanPatterns) {
              const nested = path.join(full, sub.name, pattern);
              if (fs.existsSync(nested)) {
                rmDir(nested);
                cleanedCount++;
              }
            }
          }
        }
      } else {
        for (const pattern of cleanPatterns) {
          const nested = path.join(full, pattern);
          if (fs.existsSync(nested)) {
            rmDir(nested);
            cleanedCount++;
          }
        }
      }
    }
  }
}
cleanNodeModules(nm);
console.log(`  Cleaned ${cleanedCount} test/docs/example directories`);
console.log(`  Saved ~${savedMB}MB from dev-only packages`);

// Remove deeply nested source dirs that exceed Windows MAX_PATH (260 chars)
// These are onnxruntime-web source files not needed at runtime
const deepDirs = [
  path.join(nm, '@huggingface', 'transformers', 'node_modules', 'onnxruntime-web', 'lib', 'onnxjs'),
  path.join(nm, '@xenova', 'transformers', 'node_modules', 'onnxruntime-web', 'lib', 'onnxjs'),
  // Remove deeply nested node_modules that cause Windows path length issues
  path.join(nm, '@huggingface', 'transformers', 'node_modules', 'onnxruntime-web', 'node_modules'),
  path.join(nm, '@xenova', 'transformers', 'node_modules', 'onnxruntime-web', 'node_modules'),
  // Remove sharp vendor include headers (not needed at runtime, very deep paths)
  path.join(nm, '@xenova', 'transformers', 'node_modules', 'sharp', 'vendor', '8.14.5', 'win32-x64', 'include'),
  path.join(nm, '@huggingface', 'transformers', 'node_modules', 'sharp', 'vendor', '8.14.5', 'win32-x64', 'include'),
  // Remove next.js experimental react-server-dom dirs (deep paths, not needed)
  path.join(RESOURCES_APP, '.next', 'node_modules', 'next', 'dist', 'compiled', 'react-server-dom-turbopack-experimental'),
  path.join(RESOURCES_APP, '.next', 'node_modules', 'next', 'dist', 'compiled', 'react-server-dom-webpack-experimental'),
  path.join(nm, 'next', 'dist', 'compiled', 'react-server-dom-turbopack-experimental'),
  path.join(nm, 'next', 'dist', 'compiled', 'react-server-dom-webpack-experimental'),
];
for (const dir of deepDirs) {
  if (fs.existsSync(dir)) {
    rmDir(dir);
    console.log('  Removed deep nested path:', path.relative(RESOURCES_APP, dir));
  }
}

// Remove .map files and .d.ts files to save space and shorten paths
let mapCount = 0;
let dtsCount = 0;
function removeMapFiles(dir) {
  if (!fs.existsSync(dir)) return;
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) removeMapFiles(full);
    else if (entry.name.endsWith('.map')) {
      fs.unlinkSync(full);
      mapCount++;
    } else if (entry.name.endsWith('.d.ts')) {
      fs.unlinkSync(full);
      dtsCount++;
    }
  }
}
removeMapFiles(nm);
console.log(`  Removed ${mapCount} .map files and ${dtsCount} .d.ts files`);

// Verify no paths exceed 260 chars (using absolute paths like Inno Setup does)
let longPaths = 0;
function checkLongPaths(dir) {
  if (!fs.existsSync(dir)) return;
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    const abs = path.resolve(full);
    if (abs.length > 258) longPaths++;
    if (entry.isDirectory()) checkLongPaths(full);
  }
}
checkLongPaths(APP_DIR);
if (longPaths > 0) {
  console.warn(`  WARNING: ${longPaths} paths exceed 260 chars — installer may fail`);
} else {
  console.log('  All paths within Windows MAX_PATH limit');
}

// ─── Step 4: Copy Puppeteer Chromium ────────────────────────────────
console.log('\n=== Bundling Puppeteer Chromium ===');
const puppeteerCache = path.join(process.env.USERPROFILE, '.cache', 'puppeteer');
const destChrome = path.join(RESOURCES_APP, '.chromium');

if (fs.existsSync(puppeteerCache)) {
  copyDirSync(puppeteerCache, destChrome);
  console.log(`  Copied Chromium from ${puppeteerCache}`);
  console.log(`  Size: ${getDirSizeMB(destChrome)}MB`);
} else {
  console.warn('  WARNING: Puppeteer cache not found at', puppeteerCache);
  console.warn('  The app will need Chromium installed or will download it on first launch.');
}

// ─── Step 5: Summary ────────────────────────────────────────────────
console.log('\n=== Build Complete ===');
console.log(`  Output: ${APP_DIR}`);
console.log(`  Total size: ${getDirSizeMB(APP_DIR)}MB`);
console.log(`  Executable: ${path.join(APP_DIR, APP_NAME + '.exe')}`);
