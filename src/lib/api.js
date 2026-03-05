const API_BASE = '/api';

class ApiError extends Error {
  constructor(status, message) {
    super(message);
    this.status = status;
  }
}

async function request(path, options = {}) {
  const { method = 'GET', body, ...rest } = options;

  const config = {
    method,
    credentials: 'include',
    headers: { 'Content-Type': 'application/json' },
    ...rest,
  };

  if (body) config.body = JSON.stringify(body);

  const res = await fetch(`${API_BASE}${path}`, config);

  if (res.status === 401) {
    window.dispatchEvent(new CustomEvent('auth:expired'));
    throw new ApiError(401, 'Sessione scaduta');
  }

  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    throw new ApiError(res.status, data.error || 'Errore di rete');
  }

  if (res.status === 204) return null;
  return res.json();
}

export const api = {
  get:    (path) => request(path),
  post:   (path, body) => request(path, { method: 'POST', body }),
  put:    (path, body) => request(path, { method: 'PUT', body }),
  delete: (path) => request(path, { method: 'DELETE' }),
};
