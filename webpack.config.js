require('dotenv').config({ path: __dirname + '/.env' });

const webpack = require('webpack');

module.exports = {
    entry: __dirname + '/index.js',
    output: {
        path: __dirname + '/dist',
        filename: 'index.js',
    },
    target: 'webworker',
    mode: 'production',
    optimization: {
        minimize: false,
    },
    performance: {
        hints: false,
    },
    plugins: [
        new webpack.DefinePlugin({
            TEST_VAR: JSON.stringify(process.env.TEST_VAR),
            SENTRY_PROJECT_ID_VAR: JSON.stringify(process.env.SENTRY_PROJECT_ID_VAR),
            SENTRY_KEY_VAR: JSON.stringify(process.env.SENTRY_KEY_VAR)
        }),
    ],
};