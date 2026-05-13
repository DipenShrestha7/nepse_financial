export type AuthUser = {
  id: number;
  username: string;
  email: string;
};

type StoredUser = {
  id: number;
  username: string;
  email: string;
  password: string;
};

const USERS_KEY = "mero_market_users";
const CURRENT_USER_KEY = "mero_market_current_user";

function readUsers(): StoredUser[] {
  try {
    const raw = localStorage.getItem(USERS_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function writeUsers(users: StoredUser[]) {
  localStorage.setItem(USERS_KEY, JSON.stringify(users));
}

export function getCurrentUser(): AuthUser | null {
  try {
    const raw = localStorage.getItem(CURRENT_USER_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (!parsed || typeof parsed !== "object") return null;

    return {
      id: Number(parsed.id),
      username: String(parsed.username || ""),
      email: String(parsed.email || ""),
    };
  } catch {
    return null;
  }
}

function setCurrentUser(user: AuthUser | null) {
  if (!user) {
    localStorage.removeItem(CURRENT_USER_KEY);
    return;
  }
  localStorage.setItem(CURRENT_USER_KEY, JSON.stringify(user));
}

function publishAuthChanged() {
  window.dispatchEvent(new Event("auth-changed"));
}

export function signupUser(input: {
  username: string;
  email: string;
  password: string;
}): { ok: true; user: AuthUser } | { ok: false; error: string } {
  const users = readUsers();
  const normalizedEmail = input.email.trim().toLowerCase();

  if (users.some((u) => u.email.toLowerCase() === normalizedEmail)) {
    return { ok: false, error: "An account with this email already exists." };
  }

  const nextId = users.length > 0 ? Math.max(...users.map((u) => u.id)) + 1 : 1;
  const newUser: StoredUser = {
    id: nextId,
    username: input.username.trim(),
    email: normalizedEmail,
    password: input.password,
  };

  users.push(newUser);
  writeUsers(users);

  const authUser: AuthUser = {
    id: newUser.id,
    username: newUser.username,
    email: newUser.email,
  };

  setCurrentUser(authUser);
  publishAuthChanged();
  return { ok: true, user: authUser };
}

export function loginUser(input: {
  email: string;
  password: string;
}): { ok: true; user: AuthUser } | { ok: false; error: string } {
  const users = readUsers();
  const normalizedEmail = input.email.trim().toLowerCase();

  const match = users.find(
    (u) =>
      u.email.toLowerCase() === normalizedEmail &&
      u.password === input.password,
  );

  if (!match) {
    return { ok: false, error: "Invalid email or password." };
  }

  const authUser: AuthUser = {
    id: match.id,
    username: match.username,
    email: match.email,
  };

  setCurrentUser(authUser);
  publishAuthChanged();
  return { ok: true, user: authUser };
}

export function logoutUser() {
  setCurrentUser(null);
  publishAuthChanged();
}
