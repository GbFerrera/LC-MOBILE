const { getDefaultConfig } = require('expo/metro-config');

const config = getDefaultConfig(__dirname);

// Configuração para resolver warnings de ref no React 19
config.transformer.minifierConfig = {
  ...config.transformer.minifierConfig,
  keep_fnames: true,
};

module.exports = config;