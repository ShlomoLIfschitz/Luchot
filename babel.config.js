module.exports = function (api) {
  api.cache(true);
  return {
    // babel-preset-expo adds the react-native-worklets plugin (Reanimated 4) itself.
    presets: ['babel-preset-expo'],
  };
};
