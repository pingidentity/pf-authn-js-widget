
let stateTemplates = new Map();

/**
 * get the corresponding template for the state.
 * By convention, the template should be the same name as the state but in lower case with a handlebars extension
 * @param key name of the state in lower case
 * @returns {template} template content
 */
export function getTemplate(key) {
  key = key.toLowerCase();
  let template = stateTemplates.get(key);
  if(template === undefined) {
    template = require(`./partials/${key}.handlebars`);
    stateTemplates.set(key, template);
  }
  return template;
}


