const { getDefaultConfig } = require("expo/metro-config");

/** @type {import('expo/metro-config').MetroConfig} */
const config = getDefaultConfig(__dirname);

// Support .sql file imports (needed for drizzle migrations)
config.resolver.sourceExts.push("sql");

// Support .wasm files needed by expo-sqlite's WebAssembly web worker
config.resolver.assetExts.push("wasm");

module.exports = config;
