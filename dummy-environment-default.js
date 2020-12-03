// Here just for tests to find
// environment configuration is things related to where
// the code is running, on a dev machine or a deployment

module.exports = {
    GA_TAG: false,
    WEBPACK_CONFIG: {
        devServer: {
            port: 8080,
        }
    },
    GUEST_USERNAME: "Guest"
};
