
import {
  createContext,
  useContext,
  useEffect,
  useState
} from "react";

import {
  api,
  post,
  saveToken,
  removeToken
} from "../api/api";

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;

    async function loadUser() {
      const token = localStorage.getItem("dovex_token");

      if (!token) {
        if (active) setLoading(false);
        return;
      }

      try {
        const result = await api("/auth/me");

        if (active) setUser(result.user);
      } catch {
        removeToken();

        if (active) setUser(null);
      } finally {
        if (active) setLoading(false);
      }
    }

    loadUser();

    return () => {
      active = false;
    };
  }, []);

  async function login(credentials) {
    const result = await post("/auth/login", credentials);

    saveToken(result.token);
    setUser(result.user);

    return {
      user: result.user,
      accountState: result.accountState
    };
  }

  async function loginCustomer(credentials) {
    const result = await post("/auth/login", credentials);
    if (result.user?.role !== "customer") {
      throw new Error("That login belongs to a seller account. Use a customer account to order.");
    }
    saveToken(result.token);
    setUser(result.user);
    return result;
  }

  async function register(details) {
    const result = await post("/auth/register", details);

    saveToken(result.token);
    setUser(result.user);

    return result;
  }

  async function registerCustomer(details) {
    const result = await post("/auth/customer/register", details);
    saveToken(result.token);
    setUser(result.user);
    return result;
  }

  async function refreshUser() {
    const result = await api("/auth/me");
    setUser(result.user);
    return result.user;
  }

  function logout() {
    removeToken();
    setUser(null);
  }

  return (
    <AuthContext.Provider
      value={{
        user,
        loading,
        login,
        loginCustomer,
        register,
        registerCustomer,
        logout,
        refreshUser
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);

  if (!context) {
    throw new Error("useAuth must be used inside AuthProvider.");
  }

  return context;
}
