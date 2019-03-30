require("dotenv").config()

const path = require("path")
const webpack = require("webpack")
const CleanWebpackPlugin = require("clean-webpack-plugin")
const MiniCssExtractPlugin = require("mini-css-extract-plugin")
const HtmlWebpackPlugin = require("html-webpack-plugin")
const RemoveSourceMapPlugin = require("./webpack/RemoveSourceMapPlugin")
const ZipPlugin = require("zip-webpack-plugin")
const {
  BugsnagBuildReporterPlugin,
  BugsnagSourceMapUploaderPlugin
} = require("webpack-bugsnag-plugins")

module.exports = env => {
  const config = {
    entry: {
      background: "./src/js/background.js",
      content: "./src/js/content.js",
      popup: "./src/js/popup.js",
      options: "./src/js/options.js"
    },
    output: {
      path: path.join(__dirname, `build/${env.browser}`),
      filename: `[name].${process.env.npm_package_version}.js`
    },
    module: {
      rules: [
        {
          test: /\.scss$/,
          use: [
            {
              loader: MiniCssExtractPlugin.loader
            },
            "css-loader",
            {
              loader: "sass-loader",
              options: {
                includePaths: [path.join(__dirname, "src/css")]
              }
            }
          ],
          exclude: /node_modules/
        },
        {
          test: /\.js$/,
          exclude: /node_modules/,
          use: {
            loader: "babel-loader"
          }
        },
        {
          test: /\.(jpg|png)$/,
          loader: "file-loader",
          options: {
            name: "[path][name].[ext]"
          },
          exclude: /node_modules/
        }
      ]
    },
    plugins: [
      new CleanWebpackPlugin([`build/${env.browser}`]),
      new webpack.DefinePlugin({
        "process.env.NODE_ENV": JSON.stringify(env.NODE_ENV),
        "process.env.BUGSNAG_API_KEY": JSON.stringify(
          process.env.BUGSNAG_API_KEY
        )
      }),
      new MiniCssExtractPlugin({
        filename: "[name].css",
        chunkFilename: "[id].css"
      }),
      new HtmlWebpackPlugin({
        template: path.join(__dirname, "src", "background.html"),
        filename: "background.html",
        chunks: ["background"]
      }),
      new HtmlWebpackPlugin({
        template: path.join(__dirname, "src", "popup.html"),
        filename: "popup.html",
        chunks: ["popup"]
      }),
      new HtmlWebpackPlugin({
        template: path.join(__dirname, "src", "options.html"),
        filename: "options.html",
        chunks: ["options"]
      })
    ],
    resolve: {
      modules: [path.join(__dirname, "src/js"), "node_modules"],
      alias: {
        images: path.join(__dirname, "src/images")
      }
    },
    mode: env.NODE_ENV || "development",
    devtool: "cheap-module-source-map"
  }

  if (env.NODE_ENV === "production") {
    config.devtool = "source-maps"

    if (process.env.BUGSNAG_API_KEY) {
      config.plugins.push(
        new BugsnagBuildReporterPlugin({
          apiKey: process.env.BUGSNAG_API_KEY,
          appVersion: process.env.npm_package_version,
          releaseStage: "production"
        }),
        // important: upload sourcemaps before removing source mapping url
        new BugsnagSourceMapUploaderPlugin({
          apiKey: process.env.BUGSNAG_API_KEY,
          appVersion: process.env.npm_package_version,
          publicPath:
            env.browser === "firefox"
              ? "moz-extension*://*/"
              : "chrome-extension*://*/", // extra asterisk after protocol needed
          overwrite: true
        })
      )
    }

    config.plugins.push(
      new RemoveSourceMapPlugin(),
      new ZipPlugin({
        filename: `moco-bx-${env.browser}-v${
          process.env.npm_package_version
        }.zip`,
        exclude: [/\.map$/]
      })
    )
  }

  return config
}