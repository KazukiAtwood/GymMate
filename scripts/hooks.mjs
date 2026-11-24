import { existsSync, statSync } from "node:fs";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

function asUrl(file) {
  return { url: pathToFileURL(file).href, shortCircuit: true };
}

function resolveFile(base) {
  if (existsSync(base) && statSync(base).isFile()) {
    return base;
  }

  for (const extension of [".ts", ".tsx", ".js", ".mjs"]) {
    if (existsSync(base + extension)) {
      return base + extension;
    }
  }

  for (const extension of [".ts", ".tsx", ".js"]) {
    const indexFile = path.join(base, `index${extension}`);

    if (existsSync(indexFile)) {
      return indexFile;
    }
  }

  return null;
}

export async function resolve(specifier, context, nextResolve) {
  if (specifier === "react-native") {
    return asUrl(path.join(root, "scripts/stubs/react-native.mjs"));
  }

  if (specifier === "@react-native-async-storage/async-storage") {
    return asUrl(path.join(root, "scripts/stubs/async-storage.mjs"));
  }

  if (specifier === "firebase/auth") {
    return asUrl(path.join(root, "scripts/stubs/firebase-auth.mjs"));
  }

  if (specifier.startsWith("@/")) {
    const file = resolveFile(path.join(root, "src", specifier.slice(2)));

    if (file) {
      return asUrl(file);
    }
  }

  if (specifier.startsWith(".") && context.parentURL) {
    const parent = fileURLToPath(context.parentURL);
    const file = resolveFile(path.resolve(path.dirname(parent), specifier));

    if (file) {
      return asUrl(file);
    }
  }

  return nextResolve(specifier, context);
}
