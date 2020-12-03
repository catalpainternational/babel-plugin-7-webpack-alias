const path = require("path");
const { mergeWithCustomize, customizeArray } = require("webpack-merge");

// Deliberately use mixture of quotes ' " 

module.exports = (env) => {
    // Sample of stuff that can come through `env`
    const projectConfiguration = Object.assign(
        defaultProjectConfiguration,
        env && env.PROJECT_CONFIG_PATH ? require(env.PROJECT_CONFIG_PATH) : {}
    );

    const baseConfig = {
        context: __dirname,
        mode: "development",
        devtool: "inline-source-map",
        resolve: {
            extensions: [".ts", ".js", ".cjs", ".mjs", ".json", ".riot.html"],
            modules: [path.resolve(__dirname, "src")],
            alias: {
                RiotTags: path.resolve(__dirname, "src/riot/"),
                js: path.resolve(__dirname, "src/js"),
                ReduxImpl: path.resolve(__dirname, "src/js/redux"),
                Actions: path.resolve(__dirname, "src/js/actions"),
                ts: path.resolve(__dirname, "src/ts"),
                libs: path.join(__dirname, 'src')
            },
            plugins: [PnpWebpackPlugin],
        }
    };

    const config = mergeWithCustomize({
        customizeArray: customizeArray({
            "resolve.modules": "prepend",
        }),
    })(
        baseConfig,
        projectConfiguration.WEBPACK_CONFIG
    );

    return config;
};
