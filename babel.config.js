module.exports = function (api) {
  api.cache(true);
  return {
    presets: ['babel-preset-expo'],
    plugins: [
      // Plugin para lidar com warnings de ref no React 19
      ['@babel/plugin-transform-react-jsx', {
        runtime: 'automatic'
      }],
      'react-native-reanimated/plugin',
    ],
  };
};