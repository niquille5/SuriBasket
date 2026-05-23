export function hasAuthToken() {
  return Boolean(localStorage.getItem("authToken"));
}

export function getAuthUser() {
  try {
    return JSON.parse(localStorage.getItem("authUser"));
  } catch (error) {
    return null;
  }
}

export function getAuthHeaders() {
  return {
    Authorization: "Bearer " + localStorage.getItem("authToken"),
  };
}

export function saveLogin(token, user) {
  localStorage.setItem("authToken", token);
  localStorage.setItem("authUser", JSON.stringify(user));
}

export function clearLogin() {
  localStorage.removeItem("authToken");
  localStorage.removeItem("authUser");
}

export function bindLogoutButton(button) {
  if (!button) {
    return;
  }

  button.addEventListener("click", () => {
    clearLogin();
    window.location.href = "login.html";
  });
}
