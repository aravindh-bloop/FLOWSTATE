const API_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:8080';

export async function api<T>(
  path: string,
  options: RequestInit = {}
): Promise<T> {
  const token = typeof window !== 'undefined' ? localStorage.getItem('fs_token') : null;

  const res = await fetch(`${API_URL}${path}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(options.headers as Record<string, string> | undefined),
    },
    credentials: 'include',
  });

  if (res.status === 401) {
    if (typeof window !== 'undefined' && !window.location.pathname.includes('/login')) {
      window.location.href = '/login';
    }
    throw new Error('Unauthorized');
  }

  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error((body as any).error ?? `API error ${res.status}`);
  }

  if (res.status === 204) return undefined as unknown as T;
  return res.json() as Promise<T>;
}

export async function apiLogin(email: string, password: string) {
  const res = await fetch(`${API_URL}/api/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    credentials: 'include',
    body: JSON.stringify({ email, password }),
  });

  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error((body as any).error ?? (body as any).message ?? 'Login failed');
  }

  const data = await res.json();
  if (data.token) {
    localStorage.setItem('fs_token', data.token);
  }
  return data;
}

export async function apiRegisterCoach(name: string, email: string, password: string) {
  const res = await fetch(`${API_URL}/api/auth/sign-up/email`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ name, email, password, role: 'coach' }),
  });

  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error((body as any).error ?? (body as any).message ?? 'Registration failed');
  }

  const data = await res.json();
  if (data.token) {
    localStorage.setItem('fs_token', data.token);
  }
  return data;
}

export async function apiLogout() {
  const token = typeof window !== 'undefined' ? localStorage.getItem('fs_token') : null;
  await fetch(`${API_URL}/api/auth/logout`, {
    method: 'POST',
    headers: {
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    credentials: 'include',
  }).catch(() => {});
  localStorage.removeItem('fs_token');
}
