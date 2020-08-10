const path = require('path')
const webpack = require('webpack')
const MiniCssExtractPlugin = require('mini-css-extract-plugin')
const devServer = require('./demo-server')
// const BundleAnalyzerPlugin = require('webpack-bundle-analyzer').BundleAnalyzerPlugin;
const PATHS = {
  dist: path.join(__dirname, 'dist'),
  node_modules: path.join(__dirname, 'node_modules'),
  src: path.join(__dirname, 'src'),
  scss: path.join(__dirname, 'scss'),
}

module.exports = (env, argv) => {
  const isDevelopment = argv.mode === 'development'
  const publicPath = '/';
  return {
    devServer: {
      hot: true,
      before: function (app, server) {
        var options = {
          baseUrl: argv.baseurl,
          operationMode: argv.operationmode || 'default'
        }
        console.log('#############################################');
        console.log('#')
        console.log(`# Dev server options: ${JSON.stringify(options)}`);
        console.log('#')
        console.log('#############################################');
        devServer(app, server, options)
      },
      contentBase: [path.join(__dirname, 'src')],
      compress: true,
      port: 8443,
      https: true,
    },
    entry: ['formdata-polyfill', 'whatwg-fetch', path.join(PATHS.src, 'index')],
    output: {
      path: PATHS.dist,
      filename: 'pf.authn-widget.js',
      library: 'PfAuthnWidget',
      publicPath: publicPath,
      libraryTarget: 'umd',
      globalObject: '(typeof self !== \'undefined\' ? self : this)',
      umdNamedDefine: true,
    },
    devtool: 'source-map',
    module: {
      rules: [
        {
          test: /\.(handlebars|hbs)$/,
          loader: 'handlebars-loader',
          options: {
            helperDirs: path.join(__dirname, 'src', 'helpers'),
            precompileOptions: {
              knownHelpersOnly: false,
            },
          },
          exclude: /node_modules/,
        },
        {
          test: /\.js$/,
          exclude: /(node_modules|bower_components)/,
          use: {
            loader: 'babel-loader',
          },
        },
        {
          test: /\.js$/,
          use: ['source-map-loader'],
          exclude: /(node_modules|bower_components)/,
          enforce: 'pre',
        },
        {
          test: /\.(scss|css)$/,
          use: [
            {
              loader: MiniCssExtractPlugin.loader,
            },
            {
              loader: "css-loader",
            },
            {
              loader: "resolve-url-loader",
            },
            {
              loader: "sass-loader",
              options: {
                sourceMap: true,
                sourceMapContents: false
              }
            },

          ]
        },
        {
          test: /\.(jpg|png|gif|svg)$/,
          use: [
            {
              loader: 'file-loader',
              options: {
                name: '[name].[ext]',
                // outputPath: 'static/',
                useRelativePath: true,
              },
            },
          ],
        },
      ],
    },
    performance: {
      hints: false,
      maxEntrypointSize: 512000,
      maxAssetSize: 512000
    },
    plugins: [
      new webpack.ProvidePlugin({
        Promise: ['es6-promise', 'Promise']
      }),
      new webpack.LoaderOptionsPlugin({
        options: {
          handlebarsLoader: {},
        },
      }),
      new MiniCssExtractPlugin({
        filename: '[name]-styles.css',
        chunkFilename: '[id].css',
      }),
      // new BundleAnalyzerPlugin(),
    ],
  }
}

