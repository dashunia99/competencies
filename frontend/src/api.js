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
    const detail = errorData.detail;
    const message = Array.isArray(detail)
      ? detail.map((issue) => issue.msg).filter(Boolean).join('; ')
      : typeof detail === 'string' ? detail : null;
    throw new Error(message || `Ошибка сервера: ${response.status}`);
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

export async function getStacksApi() {
  return apiFetch('/users/stacks');
}

export async function updateUserProfileApi(userId, updates) {
  return apiFetch(`/users/${userId}`, {
    method: 'PATCH',
    body: JSON.stringify(updates),
  });
}

export async function uploadSubmissionFileApi(file, submissionId) {
  const headers = {};
  const token = getToken();
  if (token) headers.Authorization = `Bearer ${token}`;

  const formData = new FormData();
  formData.append('file', file);
  formData.append('submission_id', submissionId);

  const response = await fetch(`${API_BASE}/content/upload`, {
    method: 'POST',
    headers,
    body: formData,
  });

  if (response.status === 401) removeToken();
  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    const detail = errorData.detail;
    const message = Array.isArray(detail)
      ? detail.map((issue) => issue.msg).filter(Boolean).join('; ')
      : typeof detail === 'string' ? detail : null;
    throw new Error(message || `Ошибка загрузки файла: ${response.status}`);
  }

  return response.json();
}

export async function getFileDownloadUrlApi(fileId) {
  return apiFetch(`/content/files/${fileId}/download-url`);
}

export async function getSubmissionFilesApi() {
  return apiFetch('/content/submission-files');
}

// 4. Мягкая блокировка
export async function blockUserApi(userId) {
  return apiFetch(`/users/${userId}/block`, { method: 'POST' });
}

// 5. Дерево матрицы компетенций
export async function getMatrixBlocksApi() {
  return apiFetch('/matrices/blocks');
}

// 6. Сдача решения практической работы
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

// 7. Проверка решения экспертом
export async function reviewSubmissionApi(submissionId, status, comment) {
  return apiFetch(`/submissions/${submissionId}/review`, {
    method: 'PATCH',
    body: JSON.stringify({ status, comment }),
  });
}