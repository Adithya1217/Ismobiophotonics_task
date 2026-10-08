const { getDefaultConfig } = require('expo/metro-config');
const path = require('path');

// Monorepo: let Metro see the workspace root so @taskflow/shared resolves.
const root = path.resolve(__dirname, '../..');
const config = getDefaultConfig(__dirname);
config.watchFolders = [root];
config.resolver.nodeModulesPaths = [path.join(__dirname, 'node_modules'), path.join(root, 'node_modules')];
module.exports = config;
