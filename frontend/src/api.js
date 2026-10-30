const API_BASE = '/api/v1';

// Получение сохранённого JWT-токена
export const getToken = () => localStorage.getItem('token');
export const setToken = (token) => localStorage.setItem('token', token);
export const removeToken = () => localStorage.removeItem('token');

// Универсальная функция для отправки запросов к FastAPI
export async function apiFetch(endpoint, options = {}) {
  const token = getToken();
  const headers = {
    'Content-Type': 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
    ...options.headers,
  };

  const response = await fetch(`${API_BASE}${endpoint}`, {
    ...options,
    headers,
  });

  if (response.status === 401) {
    removeToken();
  }

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.detail || `Ошибка сервера: ${response.status}`);
  }

  return response.json();
}

// 1. Авторизация (POST /api/v1/auth/login)
export async function loginApi(email, password) {
  const data = await apiFetch('/auth/login', {
    method: 'POST',
    body: JSON.stringify({ email, password }),
  });
  if (data.access_token) {
    setToken(data.access_token);
  }
  return data;
}

// 2. Получение текущего пользователя (GET /api/v1/auth/me)
export async function getMeApi() {
  return apiFetch('/auth/me');
}

// 3. Получение пользователей (для Администратора)
export async function getUsersApi() {
  return apiFetch('/users/');
}

// 4. Мягкая блокировка (COMP-18: POST /api/v1/users/{id}/block)
export async function blockUserApi(userId) {
  return apiFetch(`/users/${userId}/block`, { method: 'POST' });
}

// 5. Дерево матрицы компетенций (COMP-20: GET /api/v1/matrices/blocks)
export async function getMatrixBlocksApi() {
  return apiFetch('/matrices/blocks');
}

// 6. Сдача решения практической работы (COMP-28: POST /api/v1/submissions)
export async function submitTaskApi(taskId, comment, fileKey = 'submission.zip') {
  return apiFetch('/submissions', {
    method: 'POST',
    body: JSON.stringify({
      task_id: taskId,
      comment,
      file_key: fileKey,
    }),
  });
}

// 7. Проверка решения экспертом (COMP-29: PATCH /api/v1/submissions/{id}/review)
export async function reviewSubmissionApi(submissionId, status, comment) {
  return apiFetch(`/submissions/${submissionId}/review`, {
    method: 'PATCH',
    body: JSON.stringify({ status, comment }),
  });
}