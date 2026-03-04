import 'dotenv/config';
import path from 'path';
import { fileURLToPath } from 'url';
import webpack from 'webpack';
import HtmlWebpackPlugin from 'html-webpack-plugin';
import CopyWebpackPlugin from 'copy-webpack-plugin';
import MiniCssExtractPlugin from 'mini-css-extract-plugin';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export default (env, argv) => {
  const isProd = argv?.mode === 'production';

  return {
    entry: './src/client/main.tsx',
    output: {
      path: path.resolve(__dirname, 'dist/public'),
      filename: '[name].[contenthash].js',
      clean: true,
      publicPath: '/',
    },
    resolve: {
      extensions: ['.tsx', '.ts', '.js', '.jsx'],
      extensionAlias: {
        '.js': ['.tsx', '.ts', '.js'],
      },
    },
    module: {
      rules: [
        {
          test: /\.tsx?$/,
          loader: 'esbuild-loader',
          options: { target: 'es2022' },
          exclude: /node_modules/,
        },
        {
          test: /\.css$/i,
          use: [
            isProd ? MiniCssExtractPlugin.loader : 'style-loader',
            'css-loader',
            {
              loader: 'postcss-loader',
              options: {
                postcssOptions: {
                  plugins: ['tailwindcss', 'autoprefixer'],
                },
              },
            },
          ],
        },
      ],
    },
    optimization: {
      splitChunks: {
        chunks: 'all',
        cacheGroups: {
          vendor: {
            test: /[\\/]node_modules[\\/]/,
            name: 'vendors',
            chunks: 'all',
          },
        },
      },
    },
    cache: {
      type: 'filesystem',
    },
    plugins: [
      new webpack.EnvironmentPlugin({
        CLOUDFLARE_TURNSTILE_SITE_KEY: null,
        STRIPE_PUBLISHABLE_KEY: null,
      }),
      new HtmlWebpackPlugin({
        template: './src/client/index.html',
        filename: 'index.html',
      }),
      new CopyWebpackPlugin({
        patterns: [
          {
            from: 'src/client/public',
            to: '',
          },
        ],
      }),
      ...(isProd
        ? [new MiniCssExtractPlugin({ filename: 'styles.[contenthash].css' })]
        : []),
    ],
    devServer: {
      static: {
        directory: path.join(__dirname, 'dist/public'),
      },
      compress: true,
      port: 3000,
      historyApiFallback: true,
      proxy: [
        {
          context: ['/api'],
          target: 'http://localhost:3001',
        },
      ],
      client: {
        overlay: {
          errors: true,
          warnings: false,
          runtimeErrors: (error) => {
            if (error.message === 'Script error.') {
              return false;
            }
            return true;
          },
        },
      },
    },
  };
};
