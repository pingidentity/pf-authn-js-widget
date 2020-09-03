import renderfield from "../../src/helpers/renderfield";

describe("Tests the renderfield helper class", () => {
  let testField = {};
  let consoleOutput = [];
  const consoleLog = output => consoleOutput.push(output)
  const originalLog = console.log

  beforeEach(() => {
    console.log = consoleLog;

    testField = {
      id: "testField",
      label: "Field Label",
      type: "Text",
      defaultValue: "default",
      required: true,
      readonly: false,
      options: [],
      initialValue: null
    }
  })

  afterEach(() => {
    console.log = originalLog;
    consoleOutput = [];
  })

  test("Test invalid field", () => {
    testField.type = "invalid";
    let field = renderfield(testField);
    expect(field).toBeUndefined();
    expect(consoleOutput).toContain("Unsupported field type: invalid");
  })

  test("Test read only text field", () => {
    testDisabledField("text");
  })

  test("Test read only email field", () => {
    testDisabledField("email");
  })

  test("Test read only phone field", () => {
    testDisabledField("phone");
  })

  test("Test read only date field", () => {
    testDisabledField("date");
  })

  test("Test read only checkbox field", () => {
    testDisabledField("checkbox");
  })

  test("Test read only dropdown field", () => {
    testField.readonly = true;
    testField.type = "dropdown";
    let field = renderfield(testField);
    const newNode = document.createElement('div');
    newNode.innerHTML = field;
    const input = newNode.querySelector("select");
    expect(input.getAttributeNames()).toContain("disabled");
  })

  test("Test read only checkbox group field", () => {
    testField.readonly = true;
    testField.type = "checkboxgroup";
    testField.options = ["option1", "option2"];
    let field = renderfield(testField);
    const newNode = document.createElement('div');
    newNode.innerHTML = field;

    const input = newNode.querySelectorAll("input");
    input.forEach(input => {
      expect(input.getAttribute("type")).toBe("checkbox");
      expect(input.getAttributeNames()).toContain("disabled");
    });
  })

  let testDisabledField = (type) => {
    testField.readonly = true;
    testField.type = type;
    let field = renderfield(testField);
    const newNode = document.createElement('div');
    newNode.innerHTML = field;

    const input = newNode.querySelector("input");
    expect(input.getAttribute("type")).toBe(type);
    expect(input.getAttributeNames()).toContain("disabled");
  }

  test("Test required text field", () => {
    testRequiredField("text");
  })

  test("Test required email field", () => {
    testRequiredField("email");
  })

  test("Test required phone field", () => {
    testRequiredField("phone");
  })

  test("Test required date field", () => {
    testRequiredField("date");
  })

  test("Test required checkbox field", () => {
    testRequiredField("checkbox");
  })

  test("Test required dropdown field", () => {
    testRequiredField("dropdown", "select");
  })

  test("Test required checkbox group field", () => {
    testRequiredField("checkboxgroup");
  })

  let testRequiredField = (field_type, input_element = "input") => {
    testField.required = true;
    testField.type = field_type;
    let field = renderfield(testField);
    const newNode = document.createElement('div');
    newNode.innerHTML = field;

    const inputs = newNode.querySelectorAll(input_element);
    inputs.forEach((input) => {
      expect(input.classList).toContain("required");
    })
  }

  test("Test default and initial value for text field", () => {
    testDefaultAndInitialValues("text");
  })

  test("Test default and initial value for email field", () => {
    testDefaultAndInitialValues("email");
  })

  test("Test default and initial value for phone field", () => {
    testDefaultAndInitialValues("phone");
  })

  test("Test default and initial value for date field", () => {
    testDefaultAndInitialValues("date");
  })

  test("Test default and initial value for checkbox field", () => {
    testField.defaultValue = "true";
    testField.type = "checkbox";
    let field = renderfield(testField);
    const newNode = document.createElement('div');
    newNode.innerHTML = field;

    const input = newNode.querySelector("input");
    expect(input.getAttributeNames()).toContain("checked");

    testField.initialValue = "false";
    field = renderfield(testField);
    const initialValueNode = document.createElement('div');
    initialValueNode.innerHTML = field;

    const initialValueElement = initialValueNode.querySelector("input");
    expect(initialValueElement.getAttributeNames()).not.toContain("checked");
  })

  test("Test default and initial value for dropdown field", () => {
    testField.defaultValue = "defaultTestValue";
    testField.options = ['defaultTestValue', 'initialTestValue'];
    testField.type = "dropdown";
    let field = renderfield(testField);
    const newNode = document.createElement('div');
    newNode.innerHTML = field;

    const dropdown = newNode.querySelector("select");
    let option = dropdown.options[dropdown.selectedIndex];
    expect(option.getAttribute("value")).toBe(testField.defaultValue);

    testField.initialValue = "initialTestValue";
    field = renderfield(testField);
    const initialValueNode = document.createElement('div');
    initialValueNode.innerHTML = field;

    const initialValueElement = initialValueNode.querySelector("select");
    option = initialValueElement.options[initialValueElement.selectedIndex];
    expect(option.getAttribute("value")).toBe(testField.initialValue);
  })

  let testDefaultAndInitialValues = (field_type) => {
    testField.defaultValue = "defaultTestValue";
    testField.type = field_type;
    let field = renderfield(testField);
    const newNode = document.createElement('div');
    newNode.innerHTML = field;

    const input = newNode.querySelector("input");
    expect(input.getAttribute("value")).toBe(testField.defaultValue);

    testField.initialValue = "initialTestValue";
    field = renderfield(testField);
    const initialValueNode = document.createElement('div');
    initialValueNode.innerHTML = field;

    const initialValueElement = initialValueNode.querySelector("input");
    expect(initialValueElement.getAttribute("value")).toBe(testField.initialValue);
  }
})