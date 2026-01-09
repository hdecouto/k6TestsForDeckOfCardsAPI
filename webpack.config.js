const path = require('path');

module.exports = {
  mode: 'production',
  entry: {
    test1: './scripts/test1.ts',
    'smoke-test': './scripts/smoke-test.ts',
    'baseline-test': './scripts/baseline-test.ts',
    'stress-test': './scripts/stress-test.ts',
    'soak-test': './scripts/soak-test.ts'
  },
  output: {
    path: path.resolve(__dirname, 'dist'),
    libraryTarget: 'commonjs',
    filename: '[name].js'
  },
  resolve: {
    extensions: ['.ts', '.js']
  },
  module: {
    rules: [
      {
        test: /\.ts$/,
        use: 'ts-loader',
        exclude: /node_modules/
      }
    ]
  },
  target: 'web',
  externals: /^(k6|https?\:\/\/)(\/.*)?/,
  devtool: 'source-map',
  stats: {
    colors: true
  }
};
