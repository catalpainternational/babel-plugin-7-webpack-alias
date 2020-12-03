> ## Status
> This plugin is an update of [babel-plugin-webpack-alias-7](https://github.com/shortminds/babel-plugin-webpack-alias-7)
> Which was itself a port of the [Babel 6 version](https://github.com/trayio/babel-plugin-webpack-alias)

# babel-plugin-7-webpack-alias
Babel 7 plugin for working with webpack aliases.

The objective of this plugin is to provide support for `yarn 2` (AKA berry), `ava`, and `webpack` configs that are defined as object returning functions.

As well as support for `import`ing your dependencies.

Hopefully it will still work with `npm`, your preferred testing framework (it uses `jest` itself), and more 'usual' `webpack` configs.

## Some Hints for Working With Yarn 2 (berry)

If your `build` works OK, but your `test` runs are reporting errors like:

`Error: Your application tried to access <Some resolve alias you used>, but it isn't declared in your dependencies; this makes the require call ambiguous and unsound.`

Then the fault is `yarn`'s 

So how can you fix it?  You need to replicate your `webpack` resolve alias settings in your `package.json` `dependencies` as `link`s.

Here's an example:

- If your `webpack.config` includes an alias like this: `Actions: path.resolve(__dirname, "src/js/actions")`

- Then add the following as a `dependency` in your `package.json`: `"Actions": "link:src/js/actions"`

- Then rerun plain `yarn` to get it to rework all of its stuff, otherwise it won't pick up on the above change.

Note in the above `link` statement that there is no space before or after the colon, i.e. this works `link:src/js/actions`, but this doesn't `link: src/js/actions`.

The following is from [babel-plugin-webpack-alias-7](https://github.com/shortminds/babel-plugin-webpack-alias-7)
------

This plugin is simply going to take the aliases defined in your webpack config and replace require paths. It is especially useful when you rely on webpack aliases to keep require paths nicer (and sometimes more consistent depending on your project configuration) but you can't use webpack in a context, for example for unit testing.

## Example

`webpack.config.js`
```js
var path = require('path');
...

module.exports = {
    ...
    resolve: {
        ...
        alias: {
            '@libs': path.join(__dirname, '/myLibs/')
        }
    }
    ...
};

```
Code:
```js
    const myLib = require('@libs/myLib');
```
Transpiles to:
```js
    const myLib = require('/myLibs/myLib');
```

## Installation
```console
    $ npm install --save-dev babel-plugin-webpack-alias-7
```

Add the plugin to your `.babelrc`.  Optionally, add a path to a webpack config file, otherwise the plugin will look for `webpack.config.js` or `webpack.config.babel.js` in the root where the build was run.  Setting the config option will transform all alias destinations to be relative to the custom config.

```json
    {
        "plugins": [
            "@babel/plugin-transform-strict-mode",
            "@babel/plugin-transform-parameters",
            "@babel/plugin-transform-destructuring",
            "@babel/plugin-transform-modules-commonjs",
            "@babel/plugin-proposal-object-rest-spread",
            "@babel/plugin-transform-spread",
            "@babel/plugin-proposal-export-default-from",
            "@babel/plugin-proposal-export-namespace-from"
        ],
        "env": {
            "test": {
                "plugins": [
                    [ "babel-plugin-webpack-alias-7", { "config": "./configs/webpack.config.test.js" } ]
                ]
            }
        }
    }
```
In this example, the plugin will only be run when `NODE_ENV` is set to `test`.

## Notes

- If using this plugin with [require-extension-hooks](https://github.com/jackmellis/require-extension-hooks) you'll need to add your webpack file to _hooks'_ [excludePattern](https://github.com/jackmellis/require-extension-hooks#excludepattern--fn) - otherwise the webpack config will always be required as empty. 

## Changes from the Babel 6 version

- `config` option no longer uses lodash templates
- `findConfig` option has been removed
- `noOutputExtension` option has been removed

Change my mind on their usefulness or better yet open a PR to re-add them!
