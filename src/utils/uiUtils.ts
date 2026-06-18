export const isScriptLoaded = (name: string): boolean => {
  const scripts = document.getElementsByTagName('script');
  for (let i = 0; i < scripts.length; i++) {
    const script = scripts[i];
    if (script.src && script.src.includes(name)) {
      return true;
    }
  }
  return false;
};
