const API_URL = "http://localhost:8080";

let authToken: string | null = localStorage.getItem("token");

// Save token to memory + localStorage
export function setToken(token: string) {
  authToken = token;
  localStorage.setItem("token", token);
}

// Clear token (for logout)
export function clearToken() {
  authToken = null;
  localStorage.removeItem("token");
}

async function request(path: string, options: RequestInit = {}) {
  const headers = {
    "Content-Type": "application/json",
    ...(authToken ? { Authorization: `Bearer ${authToken}` } : {}),
    ...options.headers,
  };

  const res = await fetch(`${API_URL}${path}`, { ...options, headers });
  const data = await res.json().catch(() => null);

  if (!res.ok) {
    throw new Error(data?.error || `Request failed: ${res.status}`);
  }

  return data;
}

export const api = {
  signup: (email: string, password: string) =>
    request("/signup", {
      method: "POST",
      body: JSON.stringify({ email, password }),
    }),
  login: (email: string, password: string) =>
    request("/login", {
      method: "POST",
      body: JSON.stringify({ email, password }),
    }),
  me: () => request("/me"),
};
