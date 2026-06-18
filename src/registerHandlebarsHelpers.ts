import Handlebars from 'handlebars';

const helperModules = import.meta.glob('./helpers/*.ts', { eager: true });

Object.entries(helperModules).forEach(([filePath, helperModule]) => {
  const helperName = filePath.split('/').pop()!.replace('.ts', '');
  const mod = helperModule as { default?: unknown };
  const helperFn = mod.default ?? helperModule;
  if (typeof helperFn === 'function') {
    Handlebars.registerHelper(helperName, helperFn as Handlebars.HelperDelegate);
  }
});
