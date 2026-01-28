import axios from "axios";

const isLocalHost = (host: string) => host === "localhost" || host === "127.0.0.1";

const resolveBaseUrl = () => {
  // In production, use relative URLs (empty string) since frontend and backend
  // are served from the same origin
  const envBase = import.meta.env.VITE_API_BASE;
  if (envBase) return envBase;

  // For development with Vite proxy, use empty string (relative URLs work)
  // For production Docker build, also use empty string (same origin)
  return "";
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
