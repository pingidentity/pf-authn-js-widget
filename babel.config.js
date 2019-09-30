module.exports = function (api) {
  // api.cache(true);
  const presets = [
    ["@babel/preset-env",
      {
        useBuiltIns: "usage",
        corejs: 3,
        "modules": "commonjs"
      }],
    "minify",
  ];
  let plugins = [
    "add-module-exports",
    ["@babel/plugin-transform-runtime", {
      "corejs": 3,
    }
    ],
     "@babel/plugin-proposal-class-properties",
     "@babel/plugin-transform-arrow-functions",

  ];

  if(api.env("production"))
    plugins.push(["transform-remove-console"]);

  return {
    presets,
    plugins,
  };
}


