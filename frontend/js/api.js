const API_BASE_URL = "";

export async function fetchJson(path, options = {}) {
  return requestJson(path, options);
}

export async function fetchJsonWithAuth(path, options = {}) {
  return requestJson(path, { ...options, auth: true });
}

export async function postJson(path, payload, options = {}) {
  return requestJson(path, {
    ...options,
    method: options.method || "POST",
    body: payload,
  });
}

export async function requestJson(path, options = {}) {
  const { auth = false, body, headers = {}, ...fetchOptions } = options;
  const requestHeaders = { ...headers };

  const shouldStringifyBody =
    body !== undefined && !(body instanceof FormData) && typeof body !== "string";

  if (body !== undefined && !(body instanceof FormData)) {
    requestHeaders["Content-Type"] = requestHeaders["Content-Type"] || "application/json";
  }

  if (auth) {
    requestHeaders.Authorization = "Bearer " + getAuthToken();
  }

  const response = await fetch(API_BASE_URL + path, {
    ...fetchOptions,
    headers: requestHeaders,
    body: shouldStringifyBody ? JSON.stringify(body) : body,
  });

  const data = await parseJsonResponse(response);

  if (!response.ok) {
    throw new Error(data.message || data.error || "Request failed: " + response.status);
  }

  return data;
}

function getAuthToken() {
  const token = localStorage.getItem("authToken");
  return token || "";
}

async function parseJsonResponse(response) {
  const text = await response.text();

  if (!text) {
    return {};
  }

  try {
    return JSON.parse(text);
  } catch (error) {
    return {};
  }
}
