declare module 'validate.js' {
  const validator: {
    isEmpty(value: unknown): boolean;
    isString(value: unknown): boolean;
    isFunction(value: unknown): boolean;
  };
  export default validator;
}
