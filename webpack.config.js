const path = require('path');
const webpack = require('webpack');
const MiniCssExtractPlugin = require("mini-css-extract-plugin");
// const BundleAnalyzerPlugin = require('webpack-bundle-analyzer').BundleAnalyzerPlugin;
const PATHS = {
  dist: path.join(__dirname, 'dist'),
  node_modules: path.join(__dirname, 'node_modules'),
  src: path.join(__dirname, 'src')
};

module.exports = (env, argv) => {
  const isDevelopment = argv.mode === 'development';
  return {
    entry: ['whatwg-fetch', path.join(PATHS.src, 'index')],
    output: {
      path: PATHS.dist,
        filename: 'pf.authn-widget.js',
        library: 'PfAuthnWidget',
        publicPath: '/',
        sourceMapFilename: 'pf.authn-widget.map',
        libraryTarget: 'umd'
    },
    devtool: "source-map",
    module: {
      rules: [
        { test: /\.handlebars$/, loader: "handlebars-loader" },
        {
          test: /\.js$/,
          exclude: /(node_modules|bower_components)/,
          use: {
            loader: 'babel-loader'
          },
        },
        {
          test: /\.js$/,
          use: ["source-map-loader"],
          enforce: "pre"
        },
        {
          test: /\.(scss|css)$/,
          use: [
            MiniCssExtractPlugin.loader,
            {
              loader: "css-loader",
              options: {
                sourceMap: isDevelopment,
                minimize: !isDevelopment
              }
            },
            {
              loader: "postcss-loader",
            },
            {
              loader: "sass-loader",
              options: {
                sourceMap: isDevelopment
              }
            }
          ]
        },
        {
          test: /\.(jpg|png|gif)$/,
          use: [
            {
              loader: "file-loader",
              options: {
                name: '[name].[ext]',
                outputPath: 'static/',
                useRelativePath: true,
              }
            }
          ]
        }
      ]
    },
    plugins: [
      new webpack.LoaderOptionsPlugin({
        options: {
          handlebarsLoader: {}
        }
      }),
      new MiniCssExtractPlugin({
        filename: "[name]-styles.css",
        chunkFilename: "[id].css"
      }),
      // new BundleAnalyzerPlugin(),
    ]
  }
}

