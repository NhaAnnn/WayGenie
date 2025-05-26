const createExpoWebpackConfigAsync = require("@expo/webpack-config");
const { DefinePlugin } = require("webpack");

module.exports = async function (env, argv) {
  const config = await createExpoWebpackConfigAsync(env, argv);

  // Thêm hoặc cập nhật phần fallback cho Node.js modules
  config.resolve.fallback = {
    ...config.resolve.fallback,
    crypto: require.resolve("crypto-browserify"),
    stream: require.resolve("stream-browserify"),
    // Thêm các polyfill khác nếu cần, ví dụ:
    // "buffer": require.resolve("buffer/"),
    // "process": require.resolve("process/browser")
  };

  // Thêm DefinePlugin để đảm bảo biến 'process' được định nghĩa cho browser
  config.plugins = (config.plugins || []).concat([
    new DefinePlugin({
      __DEV__: env.development,
      process: { env: {} }, // Định nghĩa process.env rỗng cho trình duyệt
    }),
  ]);

  return config;
};
