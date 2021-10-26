import {isValidEmail, isValidPhone} from '../../src/validators/inputs'

describe("isValidEmail", function () {
  it("returns true for valid email addresses", function () {
    expect(isValidEmail("jdoe@pingidentity.com")).toBe(true);
    expect(isValidEmail("jdoe+test@pingidentity.com")).toBe(true);
    expect(isValidEmail("jdoe-another_test@pingidentity.com")).toBe(true);
    expect(isValidEmail("jdoe@pingidentity.com")).toBe(true);
    expect(isValidEmail("jdoe@pingidentity.com.and.some.other.stuff")).toBe(true);
    expect(isValidEmail("jdoe@pingidentity.anewtldwith18chars")).toBe(true);
    expect(isValidEmail("jdoe@PingIdentity.Anewtldwith18chars")).toBe(true);
    expect(isValidEmail("a+b+c+2016-09-16-13-35-44.572@pingidentity.com")).toBe(true);
  });

  it("returns false for invalid email addresses", function () {
    expect(isValidEmail("jdoe@pingidentity.anewtldthatistoolong")).toBe(false);
    expect(isValidEmail("thisisnotavalidemail")).toBe(false);
    expect(isValidEmail("emailwithinvalidchars!#$@pingidentity.com")).toBe(false);
    expect(isValidEmail("")).toBe(false);
  });
});

describe("isValidPhoneNumber", function () {
  it("returns true for valid phone numbers", function () {
    expect(isValidPhone("")).toBe(true);
    expect(isValidPhone(" ")).toBe(true);
    expect(isValidPhone("1234567890")).toBe(true);
    expect(isValidPhone("1111111111111111")).toBe(true);
    expect(isValidPhone("(123)456789")).toBe(true);
    expect(isValidPhone("123-456-7890")).toBe(true);
    expect(isValidPhone("123 456 7890")).toBe(true);
    expect(isValidPhone("(555) 555-5555")).toBe(true);
    expect(isValidPhone("+61 2 8503 8000")).toBe(true);
    expect(isValidPhone("+44 20 8759 9036")).toBe(true);
    expect(isValidPhone("+1 800 444 4444")).toBe(true);
  });

  it("returns false for invalid phone numbers", function () {
    expect(isValidPhone("abc")).toBe(false);
    expect(isValidPhone("@123-456-7890")).toBe(false);
    expect(isValidPhone("!@#$%##")).toBe(false);
  });
});
