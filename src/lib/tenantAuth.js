import { initialUsers } from '../data/users';

const AUTH_KEY = 'emi_tenant_auth';

// In-memory roster the demo auth operates against. Seeded from the shared users
// list so "Users" management and login share one source of truth. Registering a
// new account pushes into this array — it does not persist past a page refresh,
// matching every other piece of mutable state in this app (no backend).
let roster = [...initialUsers];
let nextId = Math.max(...roster.map(u => u.id)) + 1;

export const DEMO_LOGIN_HINT_ADMIN = 'dewi@emi.id / Admin@123';
export const DEMO_LOGIN_HINT_EMPLOYEE = 'anto@emi.id / Staff@123';

function toSession(user) {
  return { id: user.id, name: user.name, email: user.email, role: user.role };
}

export function isTenantAuthed() {
  return !!localStorage.getItem(AUTH_KEY);
}

export function getCurrentTenantUser() {
  const raw = localStorage.getItem(AUTH_KEY);
  if (!raw) return null;
  try { return JSON.parse(raw); } catch { return null; }
}

export function isTenantAdmin() {
  return getCurrentTenantUser()?.role === 'Admin';
}

export function loginTenant(email, password) {
  const normalizedEmail = email.trim().toLowerCase();
  const user = roster.find(u => u.email.toLowerCase() === normalizedEmail && u.password === password);
  if (!user) return { ok: false, error: 'Invalid email or password.' };
  if (user.status !== 'active') return { ok: false, error: 'This account has been deactivated. Contact your admin.' };
  const session = toSession(user);
  localStorage.setItem(AUTH_KEY, JSON.stringify(session));
  return { ok: true, session };
}

export function registerTenant({ name, email, password }) {
  const normalizedEmail = email.trim().toLowerCase();
  if (roster.some(u => u.email.toLowerCase() === normalizedEmail)) {
    return { ok: false, error: 'An account with this email already exists.' };
  }
  const user = {
    id: nextId++,
    name: name.trim(),
    email: email.trim(),
    role: 'Staff',
    status: 'active',
    lastActive: '-',
    password,
  };
  roster = [...roster, user];
  const session = toSession(user);
  localStorage.setItem(AUTH_KEY, JSON.stringify(session));
  return { ok: true, session };
}

export function tenantEmailExists(email) {
  const normalizedEmail = email.trim().toLowerCase();
  return roster.some(u => u.email.toLowerCase() === normalizedEmail);
}

export function logoutTenant() {
  localStorage.removeItem(AUTH_KEY);
}
