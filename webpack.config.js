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

  return {
    devServer: {
      hot: true,
      before: function (app, server) {
        var options = {
          baseUrl: argv.baseurl,
        }
        devServer(app, server, options)
      },
      contentBase: [path.join(__dirname, 'dist')],
      compress: true,
      port: 8443,
      https: true,
    },
    entry: ['whatwg-fetch', path.join(PATHS.src, 'index')],
    output: {
      path: PATHS.dist,
      filename: 'pf.authn-widget.js',
      library: 'PfAuthnWidget',
      libraryExport: 'default',
      publicPath: '/',
      sourceMapFilename: 'pf.authn-widget.map',
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
            MiniCssExtractPlugin.loader,
            {
              loader: "css-loader",
            },
            {
              loader: "postcss-loader",
              options: {
                autoprefixer: {
                  browsers: ["last 2 versions"]
                },
              },
            },
            {
              loader: "resolve-url-loader",
            },
            {
              loader: "sass-loader",
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
    plugins: [
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

