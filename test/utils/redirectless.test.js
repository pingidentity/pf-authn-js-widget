import { vi, describe, test, expect, afterEach } from "vitest";
import {
  generateAuthorizationUrl,
  isUserAuthzFlowType,
  isAuthzFlowType,
  completeStateCallback,
  failedStateCallback,
  initRedirectless,
  FLOW_TYPE_AUTHZ,
  FLOW_TYPE_USER_AUTHZ,
} from "../../src/utils/redirectless";

describe("redirectless authorization url", () => {
  test('Basic authorization URL test, base URL without trailing "/"', () => {
    const url = generateAuthorizationUrl("https://localhost:9031", {
      client_id: "clientId",
    });
    expect(url).toBe(
      "https://localhost:9031/as/authorization.oauth2?client_id=clientId&response_mode=pi.flow",
    );
  });

  test('Basic authorization URL test, base URL with trailing "/"', () => {
    const url = generateAuthorizationUrl("https://localhost:9031/", {
      client_id: "clientId",
    });
    expect(url).toBe(
      "https://localhost:9031/as/authorization.oauth2?client_id=clientId&response_mode=pi.flow",
    );
  });

  test("Basic authorization URL test, client id contains a space", () => {
    const url = generateAuthorizationUrl("https://localhost:9031", {
      client_id: "client id",
    });
    expect(url).toBe(
      "https://localhost:9031/as/authorization.oauth2?client_id=client%20id&response_mode=pi.flow",
    );
  });

  test("Basic authorization URL test, multi-value scope array", () => {
    const url = generateAuthorizationUrl("https://localhost:9031", {
      client_id: "clientId",
      scope: ["openid", "profile"],
    });
    expect(url).toBe(
      "https://localhost:9031/as/authorization.oauth2?client_id=clientId&scope=openid%20profile&response_mode=pi.flow",
    );
  });

  test("Basic authorization URL test, single-value scope array", () => {
    const url = generateAuthorizationUrl("https://localhost:9031", {
      client_id: "clientId",
      scope: ["openid"],
    });
    expect(url).toBe(
      "https://localhost:9031/as/authorization.oauth2?client_id=clientId&scope=openid&response_mode=pi.flow",
    );
  });

  test("Basic authorization URL test, ignore unsupported query parameter", () => {
    const url = generateAuthorizationUrl("https://localhost:9031", {
      client_id: "clientId",
      unsupported: "unsupported",
    });
    expect(url).toBe(
      "https://localhost:9031/as/authorization.oauth2?client_id=clientId&response_mode=pi.flow",
    );
  });

  test("Basic authorization URL test, change authorizationEndpoint parameter", () => {
    const url = generateAuthorizationUrl(
      "https://localhost:9031",
      { client_id: "clientId" },
      "/as/authorize",
    );
    expect(url).toBe(
      "https://localhost:9031/as/authorize?client_id=clientId&response_mode=pi.flow",
    );
  });

  test("empty configuration still appends response_mode", () => {
    const url = generateAuthorizationUrl("https://localhost:9031");
    expect(url).toBe(
      "https://localhost:9031/as/authorization.oauth2?response_mode=pi.flow",
    );
  });

  test("all allowed parameters are included in the URL", () => {
    const config = {
      client_id: "cid",
      response_type: "code",
      code_challenge: "ch",
      code_challenge_method: "S256",
      redirect_uri: "https://app/cb",
      scope: ["openid"],
      state: "st",
      idp: "myIdp",
      pfidpadapterid: "adap",
      access_token_manager_id: "atm",
      aud: "aud1",
      nonce: "n1",
      prompt: "login",
      acr_values: "urn:acr:1",
      max_age: "3600",
      login_hint: "user@example.com",
      ui_locales: "en",
      id_token_hint: "hint",
      claims_locales: "en",
    };
    const url = generateAuthorizationUrl("https://localhost:9031", config);
    for (const key of Object.keys(config)) {
      expect(url).toContain(key + "=");
    }
  });
});

describe("isUserAuthzFlowType", () => {
  test("returns true when flowType is FLOW_TYPE_USER_AUTHZ", () => {
    expect(isUserAuthzFlowType({ flowType: FLOW_TYPE_USER_AUTHZ })).toBe(true);
  });

  test("returns false when flowType is FLOW_TYPE_AUTHZ", () => {
    expect(isUserAuthzFlowType({ flowType: FLOW_TYPE_AUTHZ })).toBe(false);
  });

  test("returns false when flowType is absent", () => {
    expect(isUserAuthzFlowType({})).toBe(false);
  });
});

describe("isAuthzFlowType", () => {
  test("returns true when flowType is FLOW_TYPE_AUTHZ", () => {
    expect(isAuthzFlowType({ flowType: FLOW_TYPE_AUTHZ })).toBe(true);
  });

  test("returns true when flowType is absent (default)", () => {
    expect(isAuthzFlowType({})).toBe(true);
  });

  test("returns false when flowType is FLOW_TYPE_USER_AUTHZ", () => {
    expect(isAuthzFlowType({ flowType: FLOW_TYPE_USER_AUTHZ })).toBe(false);
  });
});

describe("completeStateCallback", () => {
  test("calls onAuthorizationSuccess with authorizeResponse when status is COMPLETED", () => {
    const onAuthorizationSuccess = vi.fn();
    const state = { status: "COMPLETED", authorizeResponse: { code: "abc" } };
    completeStateCallback(state, { onAuthorizationSuccess });
    expect(onAuthorizationSuccess).toHaveBeenCalledWith({ code: "abc" });
  });

  test("does not call onAuthorizationSuccess when status is not COMPLETED", () => {
    const onAuthorizationSuccess = vi.fn();
    completeStateCallback(
      { status: "IN_PROGRESS" },
      { onAuthorizationSuccess },
    );
    expect(onAuthorizationSuccess).not.toHaveBeenCalled();
  });

  test("does not call onAuthorizationSuccess when authorizeResponse is absent", () => {
    const onAuthorizationSuccess = vi.fn();
    completeStateCallback({ status: "COMPLETED" }, { onAuthorizationSuccess });
    expect(onAuthorizationSuccess).not.toHaveBeenCalled();
  });
});

describe("failedStateCallback", () => {
  test("calls onAuthorizationFailed with the full state when status is FAILED", () => {
    const onAuthorizationFailed = vi.fn();
    const state = { status: "FAILED", error: "access_denied" };
    failedStateCallback(state, { onAuthorizationFailed });
    expect(onAuthorizationFailed).toHaveBeenCalledWith(state);
  });

  test("logs a message when status is FAILED and no onAuthorizationFailed is provided", () => {
    const consoleSpy = vi.spyOn(console, "log").mockImplementation(() => {});
    failedStateCallback({ status: "FAILED" }, {});
    expect(consoleSpy).toHaveBeenCalledWith(
      "No onAuthorizationFailed method passed in the configuration.",
    );
    consoleSpy.mockRestore();
  });

  test("does nothing when status is not FAILED", () => {
    const onAuthorizationFailed = vi.fn();
    failedStateCallback({ status: "COMPLETED" }, { onAuthorizationFailed });
    expect(onAuthorizationFailed).not.toHaveBeenCalled();
  });
});

describe("initRedirectless", () => {
  const BASE_URL = "https://localhost:9031";

  afterEach(() => {
    vi.restoreAllMocks();
  });

  test("calls onAuthorizationRequest and returns its result when provided", () => {
    const mockResponse = { ok: true };
    const onAuthorizationRequest = vi.fn().mockReturnValue(mockResponse);
    const result = initRedirectless(BASE_URL, { onAuthorizationRequest });
    expect(onAuthorizationRequest).toHaveBeenCalled();
    expect(result).toBe(mockResponse);
  });

  test("fetches the authz URL with GET and credentials include when no onAuthorizationRequest", () => {
    const mockFetch = vi.fn().mockResolvedValue({ ok: true });
    vi.stubGlobal("fetch", mockFetch);

    initRedirectless(BASE_URL, {
      client_id: "myClient",
      flowType: FLOW_TYPE_AUTHZ,
    });

    expect(mockFetch).toHaveBeenCalledWith(
      expect.stringContaining("/as/authorization.oauth2"),
      { method: "GET", credentials: "include" },
    );
  });

  test("fetches the user_authz URL when flowType is FLOW_TYPE_USER_AUTHZ", () => {
    const mockFetch = vi.fn().mockResolvedValue({ ok: true });
    vi.stubGlobal("fetch", mockFetch);

    initRedirectless(BASE_URL, {
      client_id: "myClient",
      flowType: FLOW_TYPE_USER_AUTHZ,
    });

    const [url] = mockFetch.mock.calls[0];
    expect(url).toContain("/as/user_authz.oauth2");
  });

  test("appends user_code to user_authz URL when present", () => {
    const mockFetch = vi.fn().mockResolvedValue({ ok: true });
    vi.stubGlobal("fetch", mockFetch);

    initRedirectless(BASE_URL, {
      flowType: FLOW_TYPE_USER_AUTHZ,
      user_code: "ABC123",
    });

    const [url] = mockFetch.mock.calls[0];
    expect(url).toContain("user_code=ABC123");
  });
});
