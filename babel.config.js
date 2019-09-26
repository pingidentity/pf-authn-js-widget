module.exports = function (api) {
  // api.cache(true);
  const presets = [
    ["@babel/preset-env"],
    "minify",
  ];
  let plugins = [
    ["add-module-exports"],
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


