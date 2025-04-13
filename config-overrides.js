// config-overrides.js
module.exports = function override(config) {
  config.module.rules.unshift({
    test: /\.worker\.ts$/,
    use: { loader: "worker-loader" },
    exclude: /node_modules/,
  });

  return config;
};
