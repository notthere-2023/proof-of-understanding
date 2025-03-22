// craco.config.js
const webpack = require('webpack');
const path = require('path');

module.exports = {
    webpack: {
        configure: (webpackConfig) => {
            // 添加扩展名解析
            webpackConfig.resolve.extensions = [
                ...(webpackConfig.resolve.extensions || []),
                '.ts',
                '.tsx',
                '.js',
                '.jsx',
            ];

            // 添加 fallback 配置
            webpackConfig.resolve.fallback = {
                ...webpackConfig.resolve.fallback,
                "crypto": require.resolve("crypto-browserify"),
                "path": require.resolve("path-browserify"),
                "stream": require.resolve("stream-browserify"),
                "assert": require.resolve("assert"),
                "http": require.resolve("stream-http"),
                "https": require.resolve("https-browserify"),
                "os": require.resolve("os-browserify"),
                "url": require.resolve("url"),
                "process": false,
                "fs": false
            };

            // 添加 alias 配置
            webpackConfig.resolve.alias = {
                ...webpackConfig.resolve.alias,
                'process': 'process/browser.js'
            };

            return webpackConfig;
        },
        plugins: {
            add: [
                new webpack.ProvidePlugin({
                    process: 'process/browser.js',
                    Buffer: ['buffer', 'Buffer']
                })
            ]
        }
    },
};
