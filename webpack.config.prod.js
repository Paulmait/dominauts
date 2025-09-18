const path = require('path');
const webpack = require('webpack');
const HtmlWebpackPlugin = require('html-webpack-plugin');
const CopyWebpackPlugin = require('copy-webpack-plugin');
const TerserPlugin = require('terser-webpack-plugin');
const CompressionPlugin = require('compression-webpack-plugin');
const ImageminPlugin = require('imagemin-webpack-plugin').default;
const imageminMozjpeg = require('imagemin-mozjpeg');
const imageminPngquant = require('imagemin-pngquant');

module.exports = {
  mode: 'production',
  entry: {
    main: './src/minimal-game.ts'
  },

  output: {
    path: path.resolve(__dirname, 'dist'),
    filename: '[name].[contenthash].js',
    chunkFilename: '[name].[contenthash].chunk.js',
    clean: true,
    publicPath: '/'
  },

  resolve: {
    extensions: ['.ts', '.tsx', '.js', '.jsx'],
    alias: {
      '@': path.resolve(__dirname, 'src'),
      '@components': path.resolve(__dirname, 'src/components'),
      '@services': path.resolve(__dirname, 'src/services'),
      '@utils': path.resolve(__dirname, 'src/utils'),
      '@types': path.resolve(__dirname, 'src/types'),
      '@assets': path.resolve(__dirname, 'src/assets')
    }
  },

  module: {
    rules: [
      {
        test: /\.tsx?$/,
        use: 'ts-loader',
        exclude: /node_modules/
      },
      {
        test: /\.css$/,
        use: ['style-loader', 'css-loader']
      },
      {
        test: /\.(png|svg|jpg|jpeg|gif|webp)$/i,
        type: 'asset',
        parser: {
          dataUrlCondition: {
            maxSize: 10 * 1024 // 10kb - inline small images
          }
        },
        generator: {
          filename: 'assets/images/[name].[contenthash][ext]'
        }
      },
      {
        test: /\.(woff|woff2|eot|ttf|otf)$/i,
        type: 'asset/resource',
        generator: {
          filename: 'assets/fonts/[name].[contenthash][ext]'
        }
      },
      {
        test: /\.(mp3|wav|ogg)$/i,
        type: 'asset/resource',
        generator: {
          filename: 'assets/sounds/[name].[contenthash][ext]'
        }
      }
    ]
  },

  optimization: {
    minimize: true,
    minimizer: [
      new TerserPlugin({
        terserOptions: {
          parse: {
            ecma: 2020
          },
          compress: {
            ecma: 5,
            comparisons: false,
            inline: 2,
            drop_console: true,
            drop_debugger: true,
            pure_funcs: ['console.log', 'console.info', 'console.debug']
          },
          mangle: {
            safari10: true
          },
          output: {
            ecma: 5,
            comments: false,
            ascii_only: true
          }
        },
        parallel: true,
        extractComments: false
      })
    ],

    splitChunks: {
      chunks: 'all',
      cacheGroups: {
        default: false,
        vendors: false,

        // Vendor code splitting
        framework: {
          name: 'framework',
          chunks: 'all',
          test: /[\\/]node_modules[\\/](react|react-dom|framer-motion)[\\/]/,
          priority: 40,
          enforce: true
        },

        firebase: {
          name: 'firebase',
          chunks: 'all',
          test: /[\\/]node_modules[\\/](firebase|@firebase)[\\/]/,
          priority: 35,
          enforce: true
        },

        vendor: {
          name: 'vendor',
          chunks: 'all',
          test: /[\\/]node_modules[\\/]/,
          priority: 30
        },

        // Common code
        common: {
          name: 'common',
          minChunks: 2,
          priority: 20,
          chunks: 'async',
          reuseExistingChunk: true,
          enforce: true
        },

        // Game modes (lazy loaded)
        gameModes: {
          name: 'game-modes',
          test: /[\\/]src[\\/]modes[\\/]/,
          chunks: 'async',
          priority: 15,
          reuseExistingChunk: true
        },

        // UI components
        ui: {
          name: 'ui',
          test: /[\\/]src[\\/](ui|components)[\\/]/,
          chunks: 'async',
          priority: 10,
          minChunks: 2
        }
      }
    },

    runtimeChunk: {
      name: 'runtime'
    },

    moduleIds: 'deterministic'
  },

  plugins: [
    // Define environment variables for the build
    new webpack.DefinePlugin({
      'process.env': {
        NODE_ENV: JSON.stringify('production'),
        VITE_SUPABASE_URL: JSON.stringify(process.env.VITE_SUPABASE_URL || ''),
        VITE_SUPABASE_ANON_KEY: JSON.stringify(process.env.VITE_SUPABASE_ANON_KEY || ''),
        VITE_APP_URL: JSON.stringify(process.env.VITE_APP_URL || 'https://dominauts.com'),
        VITE_APP_VERSION: JSON.stringify(process.env.VITE_APP_VERSION || '2.0.0'),
        VITE_STRIPE_PUBLISHABLE_KEY: JSON.stringify(process.env.VITE_STRIPE_PUBLISHABLE_KEY || ''),
        VITE_GA_MEASUREMENT_ID: JSON.stringify(process.env.VITE_GA_MEASUREMENT_ID || ''),
        VITE_SENTRY_DSN: JSON.stringify(process.env.VITE_SENTRY_DSN || ''),
        VITE_MIXPANEL_TOKEN: JSON.stringify(process.env.VITE_MIXPANEL_TOKEN || ''),
        VITE_ENABLE_ANALYTICS: JSON.stringify(process.env.VITE_ENABLE_ANALYTICS || 'true'),
        VITE_ENABLE_MULTIPLAYER: JSON.stringify(process.env.VITE_ENABLE_MULTIPLAYER || 'true'),
        VITE_ENABLE_TOURNAMENTS: JSON.stringify(process.env.VITE_ENABLE_TOURNAMENTS || 'false'),
        VITE_ENABLE_ADS: JSON.stringify(process.env.VITE_ENABLE_ADS || 'false'),
        VITE_ENABLE_IAP: JSON.stringify(process.env.VITE_ENABLE_IAP || 'true'),
        VITE_ENABLE_AI: JSON.stringify(process.env.VITE_ENABLE_AI || 'true'),
        VITE_ENABLE_HINTS: JSON.stringify(process.env.VITE_ENABLE_HINTS || 'true'),
        VITE_MAX_PLAYERS: JSON.stringify(process.env.VITE_MAX_PLAYERS || '4'),
        VITE_DEFAULT_GAME_MODE: JSON.stringify(process.env.VITE_DEFAULT_GAME_MODE || 'allfives'),
        VITE_TURN_TIMEOUT: JSON.stringify(process.env.VITE_TURN_TIMEOUT || '30000'),
        VITE_MAX_GAMES_PER_DAY: JSON.stringify(process.env.VITE_MAX_GAMES_PER_DAY || '100'),
        VITE_API_BASE_URL: JSON.stringify(process.env.VITE_API_BASE_URL || '/api')
      }
    }),

    new HtmlWebpackPlugin({
      template: './index.html',
      filename: 'index.html',
      minify: {
        removeComments: true,
        collapseWhitespace: true,
        removeRedundantAttributes: true,
        useShortDoctype: true,
        removeEmptyAttributes: true,
        removeStyleLinkTypeAttributes: true,
        keepClosingSlash: true,
        minifyJS: true,
        minifyCSS: true,
        minifyURLs: true
      },
      meta: {
        viewport: 'width=device-width, initial-scale=1, maximum-scale=5, user-scalable=yes',
        description: 'Dominauts™ - The ultimate dominoes experience with multiple game modes',
        'theme-color': '#1a1a2e'
      }
    }),

    new CopyWebpackPlugin({
      patterns: [
        { from: 'manifest.json', to: 'manifest.json' },
        { from: 'sw.js', to: 'sw.js' },
        { from: 'styles.css', to: 'styles.css' },
        {
          from: 'src/assets',
          to: 'assets',
          globOptions: {
            ignore: ['**/*.psd', '**/*.ai', '**/Thumbs.db']
          }
        }
      ]
    }),

    // Image optimization
    new ImageminPlugin({
      test: /\.(jpe?g|png|gif|svg)$/i,
      disable: process.env.NODE_ENV !== 'production',
      pngquant: {
        quality: '75-90',
        speed: 4,
        strip: true
      },
      optipng: {
        optimizationLevel: 5
      },
      gifsicle: {
        optimizationLevel: 3,
        colors: 256
      },
      svgo: {
        plugins: [
          { removeViewBox: false },
          { removeEmptyAttrs: true },
          { removeMetadata: true },
          { removeUselessDefs: true },
          { removeComments: true },
          { removeTitle: true }
        ]
      },
      plugins: [
        imageminMozjpeg({
          quality: 80,
          progressive: true
        }),
        imageminPngquant({
          quality: [0.75, 0.9],
          speed: 4,
          strip: true
        })
      ]
    }),

    // Gzip compression
    new CompressionPlugin({
      filename: '[path][base].gz',
      algorithm: 'gzip',
      test: /\.(js|css|html|svg|json)$/,
      threshold: 10240, // 10KB
      minRatio: 0.8,
      deleteOriginalAssets: false
    }),

    // Brotli compression
    new CompressionPlugin({
      filename: '[path][base].br',
      algorithm: 'brotliCompress',
      test: /\.(js|css|html|svg|json)$/,
      compressionOptions: {
        level: 11
      },
      threshold: 10240,
      minRatio: 0.8,
      deleteOriginalAssets: false
    })
  ],

  performance: {
    maxEntrypointSize: 300000, // 300KB
    maxAssetSize: 250000, // 250KB
    hints: 'warning',
    assetFilter: function(assetFilename) {
      // Don't warn about large images or source maps
      return !/(\.map$)|(^(favicon\.))/.test(assetFilename);
    }
  },

  stats: {
    assets: true,
    children: false,
    chunks: false,
    hash: false,
    modules: false,
    publicPath: false,
    timings: true,
    version: false,
    warnings: true,
    colors: true
  }
};