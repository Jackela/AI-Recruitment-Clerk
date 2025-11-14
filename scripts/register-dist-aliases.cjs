/**
 * Registers runtime module aliases that point workspace package imports
 * (e.g. @ai-recruitment-clerk/user-management-domain) to their compiled
 * artifacts under dist/libs.
 *
 * This lets the compiled gateway bundle `require()` internal libs even
 * though they are not published to npm.
 */
const { existsSync, readdirSync, readFileSync } = require('fs');
const path = require('path');
const Module = require('module');

const distRoot = path.resolve(__dirname, '../dist/libs');
const aliasLookup = new Map();

if (existsSync(distRoot)) {
  for (const entry of readdirSync(distRoot)) {
    const libDir = path.join(distRoot, entry);
    const pkgJsonPath = path.join(libDir, 'package.json');
    if (!existsSync(pkgJsonPath)) {
      continue;
    }
    try {
      const pkg = JSON.parse(readFileSync(pkgJsonPath, 'utf8'));
      const pkgName = pkg.name ?? `@ai-recruitment-clerk/${entry}`;
      const mainFile = pkg.main || 'src/index.js';
      aliasLookup.set(pkgName, {
        root: libDir,
        main: path.join(libDir, mainFile),
      });
    } catch (err) {
      console.warn('[dist-aliases] Failed to read', pkgJsonPath, err);
    }
  }
}

const originalResolveFilename = Module._resolveFilename;
Module._resolveFilename = function patchedResolve(request, parent, isMain, options) {
  for (const [pkgName, meta] of aliasLookup.entries()) {
    if (request === pkgName) {
      return meta.main;
    }
    if (request.startsWith(`${pkgName}/`)) {
      const subPath = request.slice(pkgName.length + 1);
      return path.join(meta.root, subPath);
    }
  }
  return originalResolveFilename.call(this, request, parent, isMain, options);
};

console.log(
  `[dist-aliases] Registered ${aliasLookup.size} workspace library aliases from ${distRoot}`,
);
