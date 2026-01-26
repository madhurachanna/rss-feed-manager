import axios from "axios";

const isLocalHost = (host: string) => host === "localhost" || host === "127.0.0.1";

const resolveBaseUrl = () => {
  const envBase = import.meta.env.VITE_API_BASE;
  const isDev = import.meta.env.DEV;
  if (typeof window === "undefined") return envBase || (isDev ? "" : "http://localhost:8080");

  if (envBase) {
    if (isDev) {
      try {
        const parsed = new URL(envBase);
        if (isLocalHost(parsed.hostname)) {
          return "";
        }
      } catch {
        // If envBase is relative (or invalid), just use it.
      }
    }
    return envBase;
  }

  if (isDev) return "";
  return window.location.origin;
};

const api = axios.create({
  baseURL: resolveBaseUrl(),
  withCredentials: false,
});

// Add auth token to requests
api.interceptors.request.use((config) => {
  const token = localStorage.getItem("auth_token");
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Handle 401 responses
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      // Clear token and redirect to login
      localStorage.removeItem("auth_token");
      // Dispatch custom event so auth context can react
      window.dispatchEvent(new CustomEvent("auth-logout"));
    }
    return Promise.reject(error);
  }
);

export default api;

// Helper to set/clear token
export function setAuthToken(token: string | null) {
  if (token) {
    localStorage.setItem("auth_token", token);
  } else {
    localStorage.removeItem("auth_token");
  }
}

export function getAuthToken(): string | null {
  return localStorage.getItem("auth_token");
}
