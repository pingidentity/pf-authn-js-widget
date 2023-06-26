/**
 * Checks if a script is loaded into the DOM or not.
 * 
 * @param {String} name the part of the script name or path to look for.
 * @returns true if the script is already loaded into the DOM, false otherwise
 */
const isScriptLoaded = (name) => {
  const scripts = document.getElementsByTagName('script');
  for (let i = 0; i < scripts.length; i++) {
    const script = scripts[i];
    if (script.src && script.src.includes(name)) {
      return true;
    }
  }
}