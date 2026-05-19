export type AuthUser = {
  id: number;
  username: string;
  email: string;
};

type AuthResponse =
  | {
      success: true;
      user: { user_id: number; user_name: string; email: string };
      token: string;
    }
  | { success: false; error: string };

const API_BASE_URL = "http://localhost:8000";
const STORAGE_KEY_USER = "mero_market_user";
const STORAGE_KEY_TOKEN = "mero_market_token";

let currentUser: AuthUser | null = null;
let currentToken: string | null = null;

function publishAuthChanged() {
  window.dispatchEvent(new Event("auth-changed"));
}

function persistSession(user: AuthUser | null, token: string | null) {
  if (user && token) {
    try {
      localStorage.setItem(STORAGE_KEY_USER, JSON.stringify(user));
      localStorage.setItem(STORAGE_KEY_TOKEN, token);
    } catch (err) {
      console.error("Failed to persist session", err);
    }
  } else {
    try {
      localStorage.removeItem(STORAGE_KEY_USER);
      localStorage.removeItem(STORAGE_KEY_TOKEN);
    } catch (err) {
      console.error("Failed to clear session", err);
    }
  }
}

function setSession(user: AuthUser | null, token: string | null) {
  currentUser = user;
  currentToken = token;
  persistSession(user, token);
  publishAuthChanged();
}

export function initializeAuth() {
  try {
    const storedUser = localStorage.getItem(STORAGE_KEY_USER);
    const storedToken = localStorage.getItem(STORAGE_KEY_TOKEN);

    if (storedUser && storedToken) {
      currentUser = JSON.parse(storedUser);
      currentToken = storedToken;
      publishAuthChanged();
    }
  } catch (err) {
    console.error("Failed to initialize auth", err);
    persistSession(null, null);
  }
}

export function getCurrentUser(): AuthUser | null {
  return currentUser;
}

export function getAuthToken(): string | null {
  return currentToken;
}

export async function signupUser(input: {
  username: string;
  email: string;
  password: string;
}): Promise<{ ok: true; user: AuthUser } | { ok: false; error: string }> {
  const response = await fetch(`${API_BASE_URL}/users`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      user_name: input.username,
      email: input.email,
      password: input.password,
    }),
  });

  const data = (await response.json()) as AuthResponse;

  if (!response.ok || !data.success) {
    return {
      ok: false,
      error: data.success ? "Failed to create account." : data.error,
    };
  }

  const user: AuthUser = {
    id: data.user.user_id,
    username: data.user.user_name,
    email: data.user.email,
  };

  setSession(user, data.token);
  return { ok: true, user };
}

export async function loginUser(input: {
  userIdOrEmail: string;
  password: string;
}): Promise<{ ok: true; user: AuthUser } | { ok: false; error: string }> {
  const normalizedUserId = input.userIdOrEmail.trim();
  const loginPayload = /^[0-9]+$/.test(normalizedUserId)
    ? { user_id: Number(normalizedUserId), password: input.password }
    : { email: normalizedUserId, password: input.password };

  const response = await fetch(`${API_BASE_URL}/users/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(loginPayload),
  });

  const data = (await response.json()) as AuthResponse;

  if (!response.ok || !data.success) {
    return { ok: false, error: data.success ? "Invalid login." : data.error };
  }

  const user: AuthUser = {
    id: data.user.user_id,
    username: data.user.user_name,
    email: data.user.email,
  };

  setSession(user, data.token);
  return { ok: true, user };
}

export function logoutUser() {
  setSession(null, null);
}
