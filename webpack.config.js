/* jshint node: true */
var path = require('path');
var webpack = require('webpack');
var argv = require('yargs').argv;

module.exports = {
  context: path.join(__dirname),
  entry: './src/index.js',
  plugins: [
    new webpack.DefinePlugin({
      'process.env': {
        'NODE_ENV': JSON.stringify('production')
      }
    }),
    new webpack.optimize.UglifyJsPlugin({
      compress: {
        warnings: true
      }
    })
  ],
  output: {
    path: path.join(__dirname, argv.ships == "dist" ? 'dist' : 'lib'),
    filename: 'dpDataTable.js',
    libraryTarget: 'umd',
    library: 'DpDataTable'
  },

  externals: argv.ships == "dist" ? {
    'react': 'React',
    'react-dom': 'ReactDOM'
  } : {},

  module: {
    loaders: [{
        test: /\.scss$/,
        // Query parameters are passed to node-sass
        loader: 'style!css!sass?outputStyle=expanded&' +
          'includePaths[]=' + (path.resolve(__dirname, './bower_components')) + '&' +
          'includePaths[]=' + (path.resolve(__dirname, './node_modules'))
      },
      {
        test: /\.json$/,
        loader: 'json-loader'
      },
      {
        test: /(\.js)|(\.jsx)$/,
        exclude: /node_modules/,
        loader: 'babel-loader',
        query: {
          optional: ['runtime'],
          stage: 0
        }
      }
    ]
  }
};