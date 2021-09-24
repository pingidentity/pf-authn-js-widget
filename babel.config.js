module.exports = function (api) {
  // api.cache(true);
  const presets = [
    ["@babel/preset-env",
      {
        useBuiltIns: "usage",
        corejs: 3,
        "modules": "umd",
      }],
    "minify",
  ];
  let plugins = [
    "add-module-exports",
    ["@babel/plugin-transform-runtime", {
      corejs: 3,
      helpers: true,
      regenerator: true,
      useESModules: false,
    },
    ],
    [
      "@babel/plugin-proposal-class-properties",
      {
        loose: true,
      },
    ],
    "@babel/plugin-transform-arrow-functions",
    [
      "@babel/plugin-proposal-private-methods",
      {
        "loose": true
      }
    ]

  ];

  if (api.env("production"))
    plugins.push(["transform-remove-console"]);

  return {
    presets,
    plugins,
  };
}


