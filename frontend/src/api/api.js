
const API_URL = import.meta.env.VITE_API_URL || "http://localhost:5000";

export function getToken() {
  return localStorage.getItem("dovex_token");
}

export function saveToken(token) {
  localStorage.setItem("dovex_token", token);
}

export function removeToken() {
  localStorage.removeItem("dovex_token");
}

export async function api(path, options = {}) {
  const token = getToken();

  const headers = {
    ...(options.body ? { "Content-Type": "application/json" } : {}),
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
    ...options.headers
  };

  const response = await fetch(`${API_URL}/api${path}`, {
    ...options,
    headers
  });

  const data = await response.json().catch(() => ({}));

  if (!response.ok) {
    const error = new Error(
      data.message || "Something went wrong."
    );

    error.status = response.status;
    error.code = data.code;
    error.data = data;

    throw error;
  }

  return data;
}

export function post(path, body) {
  return api(path, {
    method: "POST",
    body: JSON.stringify(body)
  });
}

export function put(path, body) {
  return api(path, {
    method: "PUT",
    body: JSON.stringify(body)
  });
}

export function patch(path, body) {
  return api(path, {
    method: "PATCH",
    body: JSON.stringify(body)
  });
}

export function del(path, body) {
  return api(path, {
    method: "DELETE",
    body: body ? JSON.stringify(body) : undefined
  });
}
