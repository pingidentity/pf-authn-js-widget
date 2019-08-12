
export const USERNAME_PASSWORD_REQUIRED = 'USERNAME_PASSWORD_REQUIRED';
export const USERNAME_RECOVERY_EMAIL_REQUIRED = 'USERNAME_RECOVERY_EMAIL_REQUIRED';

export const AUTH_ERROR = 'auth_error';

let stateTemplates = new Map();

/**
 * get the corresponding template for the state.
 * By convention, the template should be the same name as the state but in lower case with a handlebars extension
 * @param key
 * @returns {any}
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


