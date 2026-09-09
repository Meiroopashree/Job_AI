import axios from "axios";

const AUTH_ENDPOINTS = ["/auth/login", "/auth/register", "/auth/me"];

export const api = axios.create({
  baseURL: "/api",
});

api.interceptors.request.use((config) => {
  if (typeof window !== "undefined") {
    const token = localStorage.getItem("token");
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
  }
  return config;
});

api.interceptors.response.use(
  (response) => response,
  (error) => {
    const url = (error.config?.url || "").replace(/^\/api/, "");
    const isAuthEndpoint = AUTH_ENDPOINTS.some((ep) => url.startsWith(ep));
    if (error.response?.status === 401 && !isAuthEndpoint) {
      if (typeof window !== "undefined") {
        localStorage.removeItem("token");
        localStorage.removeItem("user");
        window.location.href = "/login";
      }
    }
    return Promise.reject(error);
  }
);
