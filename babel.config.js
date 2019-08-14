module.exports = function (api) {
  api.cache(true);

  const presets = [
    ["@babel/preset-env",
      {
        "modules": "commonjs",
      }],
    "minify",
  ];
  const plugins = [
    "add-module-exports",
    ["@babel/plugin-transform-runtime",
      {
        "corejs": 3,
      }]
    ,
    [
      "@babel/plugin-proposal-class-properties",
    ],
    ["transform-remove-console"]
  ];

  return {
    presets,
    plugins,
  };
}


