/**
 * Webpack configuration for bundling shared utilities
 */
const path = require("path");

module.exports = {
  mode: "production",
  entry: "./src/migration/umd-wrapper.ts",
  module: {
    rules: [
      {
        test: /\.tsx?$/,
        use: "ts-loader",
        exclude: /node_modules/,
      },
    ],
  },
  resolve: {
    extensions: [".tsx", ".ts", ".js"],
    alias: {
      "@": path.resolve(__dirname, "../src"),
    },
  },
  output: {
    filename: "shared-utils.js",
    path: path.resolve(__dirname, "../frontend/js"),
    library: "SharedUtils",
    libraryTarget: "umd",
    globalObject: "this",
  },
};
