import Handlebars from 'handlebars';

const helperModules = import.meta.glob('./helpers/*.js', { eager: true });

Object.entries(helperModules).forEach(([filePath, helperModule]) => {
  const helperName = filePath.split('/').pop().replace('.js', '');
  const helperFn = helperModule.default || helperModule;
  if (typeof helperFn === 'function') {
    Handlebars.registerHelper(helperName, helperFn);
  }
});
