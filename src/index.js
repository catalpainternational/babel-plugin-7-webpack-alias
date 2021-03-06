import { declare } from '@babel/helper-plugin-utils';
import { types as t } from '@babel/core';
import {
    join,
    resolve,
    relative,
    isAbsolute,
    dirname
} from 'path';
import fs from 'fs';

const PLUGIN_KEY = 'webpack alias';
const REQUIRE = 'require';
const DEFAULT_CONFIG_NAMES = ['webpack.config.js', 'webpack.config.babel.js'];

let configPath;
let webpackConfig;
let aliasConfig = {};
let aliases;

const fileExists = (path) => {
    try {
        return !fs.accessSync(path, fs.F_OK);
    } catch (e) {
        return false;
    }
};

const getConfigPath = (configPaths) => {
    let conf = null;

    // Try all config paths and return for the first found one
    configPaths.some(configPath => {
        const resolvedConfigPath = resolve(process.cwd(), configPath);

        if (resolvedConfigPath && fileExists(resolvedConfigPath)) {
            conf = resolvedConfigPath;
        }

        return conf;
    });

    return conf;
};

export default declare(api => {
    api.assertVersion(7);

    return {
        name: 'webpack alias',
        pre(state) {
            const {
                opts: {
                    plugins
                }
            } = state;

            const plugin = plugins.find(plugin => plugin.key === PLUGIN_KEY);
            const {
                options: {
                    config
                }
            } = plugin;
            const configPaths = config ? [config, ...DEFAULT_CONFIG_NAMES] : DEFAULT_CONFIG_NAMES;

            // Get webpack config
            configPath = getConfigPath(
                configPaths
            );

            // If the config comes back as null, we didn't find it, so throw an exception.
            if (!configPath) {
                throw new Error(`Cannot find any of these configuration files: ${configPaths.join(', ')}`);
            }

            // Require the config
            webpackConfig = require(configPath);

            let configType = 'unknown';
            if (Array.isArray(webpackConfig)) {
                configType = 'multi-compiler';
            } else if (typeof webpackConfig === 'function') {
                configType = 'function';
            } else if (webpackConfig) {
                configType = 'normal';
            }
            // console.info(`Webpack config type: ${configType}`);

            switch (configType) {
                case 'normal':
                    if (webpackConfig.resolve && webpackConfig.resolve.alias) {
                        aliasConfig = webpackConfig.resolve.alias;
                    }
                    break;
                case 'multi-compiler':
                    aliasConfig = webpackConfig.reduce((previous, current) => {
                        const next = Object.assign({}, previous);
                        if (current.resolve && current.resolve.alias) {
                            Object.assign(next, current.resolve.alias);
                        }
                        return next;
                    }, {});                    
                    break;
                case 'function':
                    const regex = /.*alias:\s*\{(?<alias>(.|\s)*?)\}/gm;
                    const wcValue = webpackConfig.toString();
    
                    let m;
                    while ((m = regex.exec(wcValue)) !== null) {
                        // This is necessary to avoid infinite loops with zero-width matches
                        if (m.index === regex.lastIndex) {
                            regex.lastIndex++;
                        }
    
                        if (m.groups && m.groups.alias) {
                            const aliases = m.groups.alias.split(/[\r\n]/);
                            aliases.forEach((aliasKeyValue) => {
                                const akv = aliasKeyValue.trim();
                                if (akv.length === 0) {
                                    return;
                                }
                                const alias = akv.split(':');
                                const aliasKey = alias[0].trim();
                                let aliasPath = alias.slice(1).join(':').trim();
                                if (aliasPath.startsWith('path.resolve') || aliasPath.startsWith('path.join')) {
                                    const paths = aliasPath
                                        .replace('path.resolve(', '')
                                        .replace('path.join(', '')
                                        .replace(')', '')
                                        .split(',')
                                        .filter((p) => {return p.trim();})
                                        .map((p) => {
                                            return (p !== '__dirname') ? p.trim().replace(/[\"\']/g, '') : process.cwd();
                                        });
                                    aliasPath = resolve(...paths);
                                }
                                aliasConfig[aliasKey] = aliasPath;
                            });
                        }
                    }
                    break;
                default:
                    // This should only throw in very unusual circumstances as most webpack configs will be processed as simple objects
                    throw new Error(`The webpack config file at — ${configPath} — is not in a form understood by babel-plugin-7-webpack-alias`);
            }

            // Exit if there's no alias config
            if (Object.keys(aliasConfig).length === 0) {
                throw new Error(`The webpack config file at — ${configPath} — does not contain an alias configuration`);
            }

            aliases = Object.keys(aliasConfig);
        },
        visitor: {
            ImportDeclaration(path, state) {
                const { source: nodeSource } = path.node;
                const { filename = '' } = state;

                // Prevent @babel/register from running babel to run on the webpack config
                if (filename === resolve(configPath)) {
                    return;
                }

                // Make sure required value is a string
                if (!nodeSource || !t.isStringLiteral(nodeSource)) {
                    return;
                }

                // Get the path of the StringLiteral
                const { value: filePath } = nodeSource;

                for (const alias of aliases) {
                    let aliasDestination = aliasConfig[alias];
                    const regex = new RegExp(`^${alias}(\/|$)`);

                    if (regex.test(filePath)) {
                        // notModuleRegExp from https://github.com/webpack/enhanced-resolve/blob/master/lib/Resolver.js
                        const notModuleRegExp = /^\.$|^\.[\\\/]|^\.\.$|^\.\.[\/\\]|^\/|^[A-Z]:[\\\/]/i;
                        const isModule = !notModuleRegExp.test(aliasDestination);

                        if (isModule) {
                            path.node.source = t.StringLiteral(aliasDestination);
                            return;
                        }

                        // If the filepath is not absolute, make it absolute
                        if (!isAbsolute(aliasDestination)) {
                            aliasDestination = join(process.cwd(), aliasDestination).replace(/\\/g, '/');
                        }
                        let relativeFilePath = relative(dirname(filename), aliasDestination).replace(/\\/g, '/');

                        // In case the file path is the root of the alias, need to put a dot to avoid having an absolute path
                        if (relativeFilePath.length === 0) {
                            relativeFilePath = '.';
                        }

                        let requiredFilePath = filePath.replace(alias, relativeFilePath);

                        // If the file is requiring the current directory which is the alias, add an extra slash
                        if (requiredFilePath === '.') {
                            requiredFilePath = './';
                        }

                        // In the case of a file requiring a child directory of the current directory, we need to add a dot slash
                        if (['.', '/'].indexOf(requiredFilePath[0]) === -1) {
                            requiredFilePath = `./${requiredFilePath}`;
                        }

                        // TODO: should honor enforceExtension and then use extensionConf to make sure extension

                        path.node.source = t.StringLiteral(requiredFilePath);
                        return;
                    }
                }

            },            
            CallExpression(path, state) {
                const { arguments: nodeArguments } = path.node;
                const { filename = '' } = state;

                // Prevent @babel/register from running babel to run on the webpack config
                if (filename === resolve(configPath)) {
                    return;
                }

                // If not a require statement do nothing
                if (!t.isIdentifier(path.node.callee, { name: REQUIRE })) {
                    return;
                }

                // Make sure required value is a string
                if (nodeArguments.length === 0 || !t.isStringLiteral(nodeArguments[0])) {
                    return;
                }

                // Get the path of the StringLiteral
                const [{ value: filePath }] = nodeArguments;

                for (const alias of aliases) {
                    let aliasDestination = aliasConfig[alias];
                    const regex = new RegExp(`^${alias}(\/|$)`);

                    if (regex.test(filePath)) {
                        // notModuleRegExp from https://github.com/webpack/enhanced-resolve/blob/master/lib/Resolver.js
                        const notModuleRegExp = /^\.$|^\.[\\\/]|^\.\.$|^\.\.[\/\\]|^\/|^[A-Z]:[\\\/]/i;
                        const isModule = !notModuleRegExp.test(aliasDestination);

                        if (isModule) {
                            path.node.arguments = [t.StringLiteral(aliasDestination)];
                            return;
                        }

                        // If the filepath is not absolute, make it absolute
                        if (!isAbsolute(aliasDestination)) {
                            aliasDestination = join(process.cwd(), aliasDestination).replace(/\\/g, '/');
                        }
                        let relativeFilePath = relative(dirname(filename), aliasDestination).replace(/\\/g, '/');

                        // In case the file path is the root of the alias, need to put a dot to avoid having an absolute path
                        if (relativeFilePath.length === 0) {
                            relativeFilePath = '.';
                        }

                        let requiredFilePath = filePath.replace(alias, relativeFilePath);

                        // If the file is requiring the current directory which is the alias, add an extra slash
                        if (requiredFilePath === '.') {
                            requiredFilePath = './';
                        }

                        // In the case of a file requiring a child directory of the current directory, we need to add a dot slash
                        if (['.', '/'].indexOf(requiredFilePath[0]) === -1) {
                            requiredFilePath = `./${requiredFilePath}`;
                        }

                        // TODO: should honor enforceExtension and then use extensionConf to make sure extension

                        path.node.arguments = [t.StringLiteral(requiredFilePath)];
                        return;
                    }
                }
            }
        }
    };
});
