const API_BASE_URL = "";

export async function fetchJson(path, options = {}) {
  const response = await fetch(API_BASE_URL + path, options);

  if (!response.ok) {
    throw new Error("Request failed: " + response.status);
  }

  return response.json();
}

export async function fetchJsonWithAuth(path, options = {}) {
  const token = localStorage.getItem("authToken");
  const headers = {
    ...(options.headers || {}),
    Authorization: "Bearer " + token,
  };

  return fetchJson(path, {
    ...options,
    headers,
  });
}
