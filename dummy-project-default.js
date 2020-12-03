// Here just for tests to find
// project configuration is things related to the project
// site name - branding - webpack aliases

const path = require("path");

module.exports = {
    WEBPACK_CONFIG: {
        resolve: {
            alias: {
                // OverrideImages: path.resolve(__dirname, "overrides", "img"),
            }
        }
    },
    SITE_NAME: "Dummy",
    SITE_SHORT_NAME: "Dummy",
    SITE_DESCRIPTION: "Dummies for dummies",
    BACKGROUND_COLOR: "#ffffff",
    FAVICON_PATH: "./src/favicon.ico"
};
