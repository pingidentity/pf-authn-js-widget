import { describe, test, expect, afterEach } from "vitest";
import { isScriptLoaded } from "../../src/utils/uiUtils";

describe("isScriptLoaded", () => {
  let script;

  afterEach(() => {
    script?.remove();
    script = null;
  });

  test("returns true when a script with a matching src is in the DOM", () => {
    script = document.createElement("script");
    script.src = "https://apps.example.com/signals-sdk.js";
    document.head.appendChild(script);

    expect(isScriptLoaded("signals-sdk")).toBe(true);
  });

  test("returns true when the match is a partial substring of the src", () => {
    script = document.createElement("script");
    script.src = "https://www.google.com/recaptcha/api.js?onload=cb&render=explicit";
    document.head.appendChild(script);

    expect(isScriptLoaded("recaptcha/api")).toBe(true);
  });

  test("returns undefined (falsy) when no matching script is in the DOM", () => {
    expect(isScriptLoaded("nonexistent-script")).toBeFalsy();
  });

  test("returns undefined (falsy) when a script element has no src", () => {
    script = document.createElement("script");
    script.textContent = "console.log('inline')";
    document.head.appendChild(script);

    expect(isScriptLoaded("inline")).toBeFalsy();
  });

  test("is case-sensitive — does not match different casing", () => {
    script = document.createElement("script");
    script.src = "https://apps.example.com/Signals-SDK.js";
    document.head.appendChild(script);

    expect(isScriptLoaded("signals-sdk")).toBeFalsy();
  });
});
