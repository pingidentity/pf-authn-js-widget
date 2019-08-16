module.exports = function (api) {
  // api.cache(true);
  const presets = [
    ["@babel/preset-env",
      {
        "modules": "commonjs",
      }],
    "minify",
  ];
  let plugins = [
    "add-module-exports",
    ["@babel/plugin-transform-runtime",
      {
        "corejs": 3,
      }]
    ,
    [
      "@babel/plugin-proposal-class-properties",
    ]
  ];

  if(api.env("production"))
    plugins.push(["transform-remove-console"]);

  return {
    presets,
    plugins,
  };
}


