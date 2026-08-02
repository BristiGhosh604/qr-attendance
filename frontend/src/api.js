async function request(path, options = {}) {
  let response;
  try {
    response = await fetch(path, {
      ...options,
      headers: {
        ...(options.body ? { 'Content-Type': 'application/json' } : {}),
        ...options.headers,
      },
    });
  } catch {
    throw new Error('Cannot connect to the server. Check your connection and try again.');
  }

  const contentType = response.headers.get('content-type') || '';
  const data = contentType.includes('application/json')
    ? await response.json()
    : await response.text();

  if (!response.ok) {
    const message = typeof data === 'object' ? data.error : data;
    throw new Error(message || 'The request could not be completed.');
  }
  return data;
}

export const api = {
  login: (email, password) => request('/api/auth/login', {
    method: 'POST',
    body: JSON.stringify({ email, password }),
  }),
  register: (name, email, password, role) => request('/api/auth/register', {
    method: 'POST',
    body: JSON.stringify({ name, email, password, role }),
  }),
  createSession: (teacherId, latitude, longitude, radiusMetres) => request('/api/teacher/session', {
    method: 'POST',
    body: JSON.stringify({ teacherId, latitude, longitude, radiusMetres }),
  }),
  refreshQr: (sessionId) => request(`/api/teacher/session/${sessionId}/refresh-qr`, { method: 'POST' }),
  getPresent: (sessionId) => request(`/api/teacher/session/${sessionId}/present`),
  getAudit: (sessionId) => request(`/api/teacher/session/${sessionId}/audit`),
  getAnalytics: (teacherId) => request(`/api/teacher/analytics?teacherId=${teacherId}`),
  markAttendance: (token, latitude, longitude, studentId, deviceId) => request('/api/student/attend', {
    method: 'POST',
    body: JSON.stringify({ token, latitude, longitude, studentId, deviceId }),
  }),
};

export function getStoredUser() {
  const userId = sessionStorage.getItem('userId');
  const name = sessionStorage.getItem('userName');
  const role = sessionStorage.getItem('userRole');
  return userId && name && role ? { userId: Number(userId), name, role } : null;
}

export function storeUser(user) {
  sessionStorage.setItem('userId', String(user.userId));
  sessionStorage.setItem('userName', user.name);
  sessionStorage.setItem('userRole', user.role);
}

export function clearStoredUser() {
  sessionStorage.clear();
}
