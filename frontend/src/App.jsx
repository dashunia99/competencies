import React, { useState } from 'react';

// Строго 2 стека из таблицы stacks базы данных PostgreSQL
const REAL_STACKS = [
  { id: 1, name: 'Android' },
  { id: 2, name: 'Flutter' }
];

// Пользователи системы. Сотрудник ИЗНАЧАЛЬНО БЕЗ СТЕКА (stack_id: null)
const INITIAL_USERS = [
  {
    id: 1,
    fio: 'Алексей Администраторов',
    email: 'admin@webant.ru',
    password: 'admin123password',
    role: 'Администратор',
    stack_id: 1,
    stack: 'Android',
    grade: 'Lead',
    is_active: true
  },
  {
    id: 2,
    fio: 'Елена Экспертова',
    email: 'expert@webant.ru',
    password: 'expert123password',
    role: 'Эксперт',
    stack_id: 1,
    stack: 'Android',
    grade: 'Senior',
    is_active: true
  },
  {
    id: 3,
    fio: 'Иван Сотрудников',
    email: 'employee@webant.ru',
    password: 'employee123password',
    role: 'Сотрудник',
    stack_id: null, // По дефолту стека НЕТ! Назначает только Админ
    stack: null,
    grade: 'Junior',
    is_active: true
  }
];

// Реальные матрицы из БД (competency_blocks + competencies)
const MATRICES = {
  Flutter: [
    {
      id: 1,
      name: '1. Язык Dart и базовые концепции',
      competencies: [
        { id: 101, name: 'Dart синтаксис, строгая типизация, Null Safety и коллекции (List, Map, Set).', grade: 'Junior', status: 'confirmed' },
        { id: 102, name: 'Асинхронное программирование: Future, async/await и потоки Stream.', grade: 'Junior', status: 'in_progress' }
      ]
    },
    {
      id: 2,
      name: '2. Flutter Framework и State Management',
      competencies: [
        { id: 201, name: 'Дерево виджетов: StatelessWidget vs StatefulWidget, BuildContext.', grade: 'Junior', status: 'confirmed' },
        { id: 202, name: 'Управление состоянием: Bloc / Cubit, события и состояния.', grade: 'Middle', status: 'not_started' }
      ]
    },
    {
      id: 3,
      name: '3. Сетевой слой и архитектура Flutter',
      competencies: [
        { id: 301, name: 'Работа с Dio / Http, перехватчики токенов авторизации.', grade: 'Junior', status: 'not_started' },
        { id: 302, name: 'Локальное хранилище данных: Hive / Isar / SharedPreferences.', grade: 'Junior', status: 'not_started' }
      ]
    }
  ],
  Android: [
    {
      id: 4,
      name: '1. Язык программирования Kotlin и ООП',
      competencies: [
        { id: 401, name: 'Базовый синтаксис, Null Safety, функции высшего порядка и лямбды.', grade: 'Junior', status: 'confirmed' },
        { id: 402, name: 'ООП: подтиповой полиморфизм, интерфейсы, sealed classes и делегаты.', grade: 'Junior', status: 'in_progress' }
      ]
    },
    {
      id: 5,
      name: '2. Архитектура мобильных приложений и UI',
      competencies: [
        { id: 501, name: 'Жизненный цикл Activity и Fragment, Navigation Component.', grade: 'Junior', status: 'confirmed' },
        { id: 502, name: 'Паттерн MVVM, работа с ViewModel и StateFlow/SharedFlow.', grade: 'Junior', status: 'not_started' }
      ]
    },
    {
      id: 6,
      name: '3. Сетевой стек и локальное хранилище',
      competencies: [
        { id: 601, name: 'Сетевой клиент Retrofit, OkHttp перехватчики авторизации.', grade: 'Junior', status: 'not_started' },
        { id: 602, name: 'База данных Room: Entities, DAO, миграции схемы.', grade: 'Junior', status: 'not_started' }
      ]
    }
  ]
};

// Практические задания (2 задания для тестирования сценария: одно примут, второе отклонят)
const INITIAL_TASKS = [
  {
    id: 1,
    stack: 'Flutter',
    topic: '1. Язык Dart и базовые концепции',
    title: 'Практика: Асинхронная обработка данных на Stream',
    competency: 'Асинхронное программирование: Future, async/await и потоки Stream',
    description: 'Разработать утилиту подписки на поток событий с буферизацией и обработкой ошибок.',
    attemptsUsed: 0,
    maxAttempts: 2,
    status: 'not_started',
    submissions: []
  },
  {
    id: 2,
    stack: 'Flutter',
    topic: '2. Flutter Framework и State Management',
    title: 'Практика: Экран авторизации и каталога на Bloc',
    competency: 'Управление состоянием: Bloc / Cubit, события и состояния',
    description: 'Спроектировать стейт-менеджмент экрана авторизации и списка заказов на Cubit/Bloc.',
    attemptsUsed: 0,
    maxAttempts: 2,
    status: 'not_started',
    submissions: []
  },
  {
    id: 3,
    stack: 'Android',
    topic: '1. Язык Kotlin и ООП',
    title: 'Практика: Проектирование иерархии платежных шлюзов',
    competency: 'ООП: интерфейсы, sealed classes и полиморфизм',
    description: 'Создать модульную структуру платежей с единым интерфейсом PaymentProcessor.',
    attemptsUsed: 0,
    maxAttempts: 2,
    status: 'not_started',
    submissions: []
  },
  {
    id: 4,
    stack: 'Android',
    topic: '2. Архитектура приложений',
    title: 'Практика: Экран заметок на архитектуре MVVM',
    competency: 'Паттерн MVVM, работа с ViewModel и StateFlow',
    description: 'Изолировать бизнес-логику экрана списка заметок внутри ViewModel.',
    attemptsUsed: 0,
    maxAttempts: 2,
    status: 'not_started',
    submissions: []
  }
];

export default function App() {
  const [isAuth, setIsAuth] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [authError, setAuthError] = useState('');

  // Централизованное состояние для бесшовной связки ролей
  const [users, setUsers] = useState(INITIAL_USERS);
  const [currentUserId, setCurrentUserId] = useState(null);
  const [currentRole, setCurrentRole] = useState('Сотрудник');
  const [currentTab, setCurrentTab] = useState('profile');
  const [tasks, setTasks] = useState(INITIAL_TASKS);

  // Модальные окна
  const [selectedTask, setSelectedTask] = useState(null);
  const [isSubmitModalOpen, setIsSubmitModalOpen] = useState(false);
  const [submitLink, setSubmitLink] = useState('');
  const [submitComment, setSubmitComment] = useState('');

  const [isReviewModalOpen, setIsReviewModalOpen] = useState(false);
  const [reviewVerdict, setReviewVerdict] = useState('approved');
  const [reviewComment, setReviewComment] = useState('');

  const [isChangeStackModalOpen, setIsChangeStackModalOpen] = useState(false);
  const [targetUser, setTargetUser] = useState(null);
  const [selectedStackId, setSelectedStackId] = useState(2); // по дефолту Flutter

  // Получаем актуальный объект текущего пользователя
  const currentUser = users.find((u) => u.id === currentUserId) || users[2];

  // Авторизация
  const handleLogin = (e) => {
    e.preventDefault();
    setAuthError('');
    const found = users.find((u) => u.email.toLowerCase() === email.trim().toLowerCase());
    if (!found) {
      setAuthError('Пользователь не найден');
      return;
    }
    if (found.password && found.password !== password) {
      setAuthError('Неверный пароль');
      return;
    }
    setCurrentUserId(found.id);
    setCurrentRole(found.role);
    setIsAuth(true);
    setCurrentTab(found.role === 'Администратор' ? 'users' : found.role === 'Эксперт' ? 'reviews' : 'profile');
  };

  const handleQuickLogin = (user) => {
    setCurrentUserId(user.id);
    setCurrentRole(user.role);
    setIsAuth(true);
    setCurrentTab(user.role === 'Администратор' ? 'users' : user.role === 'Эксперт' ? 'reviews' : 'profile');
    setSelectedTask(null);
  };

  const handleLogout = () => {
    setIsAuth(false);
    setSelectedTask(null);
  };

  // 1. АДМИНИСТРАТОР: Назначает / меняет стек сотруднику
  const handleSaveStack = (e) => {
    e.preventDefault();
    if (!targetUser) return;
    const chosen = REAL_STACKS.find((s) => s.id === Number(selectedStackId));
    setUsers((prev) =>
      prev.map((u) =>
        u.id === targetUser.id
          ? { ...u, stack_id: chosen.id, stack: chosen.name }
          : u
      )
    );
    setIsChangeStackModalOpen(false);
    setTargetUser(null);
  };

  // Мягкая блокировка
  const toggleUserActive = (userId) => {
    setUsers((prev) =>
      prev.map((u) => (u.id === userId ? { ...u, is_active: !u.is_active } : u))
    );
  };

  // 2. СОТРУДНИК: Отправка домашки (сдача / пересдача)
  const handleSubmitTask = (e) => {
    e.preventDefault();
    if (!selectedTask || !submitLink.trim()) return;

    const newSub = {
      id: Date.now(),
      attemptNumber: selectedTask.attemptsUsed + 1,
      authorFio: currentUser.fio,
      date: new Date().toLocaleString('ru-RU', { dateStyle: 'short', timeStyle: 'short' }),
      link: submitLink.trim(),
      comment: submitComment.trim(),
      verdict: 'pending',
      expertComment: ''
    };

    setTasks((prev) =>
      prev.map((t) => {
        if (t.id === selectedTask.id) {
          const updated = {
            ...t,
            status: 'pending',
            attemptsUsed: t.attemptsUsed + 1,
            submissions: [newSub, ...(t.submissions || [])]
          };
          setSelectedTask(updated);
          return updated;
        }
        return t;
      })
    );

    setIsSubmitModalOpen(false);
    setSubmitLink('');
    setSubmitComment('');
  };

  // 3. ЭКСПЕРТ: Проверка задания (Принять / Отклонить)
  const handleReviewSubmit = (e) => {
    e.preventDefault();
    if (!selectedTask) return;

    setTasks((prev) =>
      prev.map((t) => {
        if (t.id === selectedTask.id) {
          const subs = [...(t.submissions || [])];
          if (subs.length > 0) {
            subs[0] = {
              ...subs[0],
              verdict: reviewVerdict,
              expertComment: reviewComment || (reviewVerdict === 'approved' ? 'Работа зачтена.' : 'Возвращено на доработку.')
            };
          }
          return {
            ...t,
            status: reviewVerdict,
            submissions: subs
          };
        }
        return t;
      })
    );

    setIsReviewModalOpen(false);
    setSelectedTask(null);
    setReviewComment('');
  };

  // Фильтрованные данные под стек сотрудника
  const employeeMatrix = currentUser.stack ? MATRICES[currentUser.stack] || [] : [];
  const employeeTasks = currentUser.stack ? tasks.filter((t) => t.stack === currentUser.stack) : [];
  const pendingReviews = tasks.filter((t) => t.status === 'pending');

  // ЭКРАН 1: ВХОД (СТРОГО 3 РОЛИ)
  if (!isAuth) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl border border-slate-200 shadow-xl max-w-md w-full p-8">
          <div className="text-center mb-8">
            <div className="inline-flex items-center justify-center w-12 h-12 rounded-xl bg-indigo-600 text-white font-bold text-xl mb-3 shadow-md shadow-indigo-100">
              W
            </div>
            <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Webant Skills</h1>
            <p className="text-sm text-slate-500 mt-1">Система управления матрицами компетенций</p>
          </div>

          {authError && (
            <div className="mb-4 p-3 rounded-lg bg-rose-50 border border-rose-200 text-rose-700 text-xs font-semibold">
              {authError}
            </div>
          )}

          <form onSubmit={handleLogin} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">Email</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="name@webant.ru"
                required
                className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:outline-none focus:border-indigo-600 focus:bg-white"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">Пароль</label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                required
                className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:outline-none focus:border-indigo-600 focus:bg-white"
              />
            </div>
            <button
              type="submit"
              className="w-full py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white font-medium rounded-lg text-sm shadow-md shadow-indigo-100 transition-colors"
            >
              Войти в систему
            </button>
          </form>

          {/* СТРОГО 3 КНОПКИ ДЛЯ БЫСТРОГО ТЕСТИРОВАНИЯ */}
          <div className="mt-8 pt-6 border-t border-slate-100">
            <span className="block text-xs font-semibold text-slate-400 uppercase tracking-wider text-center mb-3">
              Быстрый вход для проверки
            </span>
            <div className="grid grid-cols-3 gap-2">
              <button
                type="button"
                onClick={() => handleQuickLogin(users[0])}
                className="p-2 border border-slate-200 rounded-lg hover:border-indigo-300 hover:bg-indigo-50/50 text-center transition-colors"
              >
                <div className="text-xs font-bold text-slate-800">Администратор</div>
                <div className="text-[10px] text-slate-400 truncate">admin@webant.ru</div>
              </button>
              <button
                type="button"
                onClick={() => handleQuickLogin(users[1])}
                className="p-2 border border-slate-200 rounded-lg hover:border-indigo-300 hover:bg-indigo-50/50 text-center transition-colors"
              >
                <div className="text-xs font-bold text-slate-800">Эксперт</div>
                <div className="text-[10px] text-slate-400 truncate">expert@webant.ru</div>
              </button>
              <button
                type="button"
                onClick={() => handleQuickLogin(users[2])}
                className="p-2 border border-indigo-200 bg-indigo-50/30 rounded-lg hover:border-indigo-400 text-center transition-colors"
              >
                <div className="text-xs font-bold text-indigo-900">Сотрудник</div>
                <div className="text-[10px] text-indigo-600 truncate">{users[2].stack ? users[2].stack : 'БЕЗ стека'}</div>
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col font-sans">
      {/* ШАПКА СИСТЕМЫ */}
      <header className="bg-white border-b border-slate-200 sticky top-0 z-30">
        <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
          <div className="flex items-center space-x-6">
            <div className="flex items-center space-x-2">
              <div className="w-8 h-8 rounded-lg bg-indigo-600 text-white font-bold flex items-center justify-center text-sm shadow-xs">
                W
              </div>
              <span className="font-bold text-slate-900 tracking-tight text-lg">Webant Skills</span>
            </div>

            {/* Навигация Сотрудника */}
            {currentRole === 'Сотрудник' && (
              <nav className="flex space-x-1">
                <button
                  onClick={() => { setCurrentTab('profile'); setSelectedTask(null); }}
                  className={`px-3 py-1.5 text-xs font-semibold rounded-md transition-colors ${
                    currentTab === 'profile' ? 'bg-indigo-50 text-indigo-700' : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  Личный кабинет
                </button>
                {currentUser.stack && (
                  <>
                    <button
                      onClick={() => { setCurrentTab('matrix'); setSelectedTask(null); }}
                      className={`px-3 py-1.5 text-xs font-semibold rounded-md transition-colors ${
                        currentTab === 'matrix' ? 'bg-indigo-50 text-indigo-700' : 'text-slate-600 hover:text-slate-900'
                      }`}
                    >
                      Матрица компетенций
                    </button>
                    <button
                      onClick={() => { setCurrentTab('tasks'); setSelectedTask(null); }}
                      className={`px-3 py-1.5 text-xs font-semibold rounded-md transition-colors ${
                        currentTab === 'tasks' ? 'bg-indigo-50 text-indigo-700' : 'text-slate-600 hover:text-slate-900'
                      }`}
                    >
                      Мои задания ({employeeTasks.length})
                    </button>
                  </>
                )}
              </nav>
            )}

            {/* Навигация Эксперта */}
            {currentRole === 'Эксперт' && (
              <nav className="flex space-x-1">
                <button
                  onClick={() => { setCurrentTab('reviews'); setSelectedTask(null); }}
                  className={`px-3 py-1.5 text-xs font-semibold rounded-md transition-colors ${
                    currentTab === 'reviews' ? 'bg-indigo-50 text-indigo-700' : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  Очередь ревью
                  {pendingReviews.length > 0 && (
                    <span className="ml-2 px-1.5 py-0.5 text-xs bg-amber-500 text-white rounded-full">
                      {pendingReviews.length}
                    </span>
                  )}
                </button>
              </nav>
            )}

            {/* Навигация Администратора */}
            {currentRole === 'Администратор' && (
              <nav className="flex space-x-1">
                <button
                  onClick={() => { setCurrentTab('users'); setSelectedTask(null); }}
                  className={`px-3 py-1.5 text-xs font-semibold rounded-md transition-colors ${
                    currentTab === 'users' ? 'bg-indigo-50 text-indigo-700' : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  Управление сотрудниками
                </button>
              </nav>
            )}
          </div>

          {/* Правая часть шапки: переключатель ролей на лету для сценария */}
          <div className="flex items-center space-x-4">
            <div className="flex items-center bg-slate-100 p-1 rounded-lg border border-slate-200">
              <span className="text-[11px] font-semibold text-slate-500 px-2">Переключить роль:</span>
              {users.map((u) => (
                <button
                  key={u.id}
                  onClick={() => handleQuickLogin(u)}
                  className={`px-2.5 py-1 text-xs font-bold rounded-md transition-colors ${
                    currentUser.id === u.id
                      ? 'bg-white text-indigo-600 shadow-xs'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  {u.role}
                </button>
              ))}
            </div>

            <button
              onClick={handleLogout}
              className="text-xs px-3 py-1.5 border border-slate-200 text-slate-600 hover:text-slate-900 rounded-lg hover:bg-slate-50"
            >
              Выйти
            </button>
          </div>
        </div>
      </header>

      {/* ОСНОВНОЙ КОНТЕНТ */}
      <main className="flex-1 max-w-7xl w-full mx-auto p-6 space-y-6">

        {/* ============================================================ */}
        {/* СЦЕНАРИЙ 1. СОТРУДНИК: ЛИЧНЫЙ КАБИНЕТ                        */}
        {/* ============================================================ */}
        {currentRole === 'Сотрудник' && currentTab === 'profile' && (
          <>
            {/* ЕСЛИ СТЕК ЕЩЁ НЕ НАЗНАЧЕН (ДЕФОЛТНОЕ СОСТОЯНИЕ) */}
            {!currentUser.stack ? (
              <div className="bg-white rounded-2xl border border-dashed border-amber-300 p-12 text-center max-w-2xl mx-auto shadow-xs space-y-4">
                <div className="w-16 h-16 bg-amber-50 text-amber-600 rounded-full flex items-center justify-center mx-auto text-2xl font-bold">
                  ⏳
                </div>
                <div>
                  <h3 className="text-xl font-bold text-slate-900">Направление развития ещё не назначено</h3>
                  <p className="text-sm text-slate-500 mt-2">
                    Администратор системы ещё не закрепил за вашим аккаунтом технологический стек (Android или Flutter). Личный кабинет, матрица и практические задания станут доступны сразу после назначения направления.
                  </p>
                </div>
                <div className="p-3 bg-amber-50/60 rounded-xl text-xs text-amber-900 border border-amber-200 max-w-md mx-auto">
                  👉 <strong>Шаг 1 сценария:</strong> Кликните в шапке на <strong>«Администратор»</strong> и назначьте Ивану Сотрудникову стек <strong>Flutter</strong> или <strong>Android</strong>.
                </div>
              </div>
            ) : (
              /* ЕСЛИ СТЕК НАЗНАЧЕН АДМИНОМ */
              <div className="grid grid-cols-3 gap-6">
                <div className="col-span-2 space-y-6">
                  <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs flex items-center justify-between">
                    <div>
                      <span className="text-xs font-semibold px-2.5 py-0.5 rounded-full bg-indigo-50 text-indigo-700">
                        {currentUser.stack} Developer • {currentUser.grade}
                      </span>
                      <h2 className="text-2xl font-bold text-slate-900 mt-2">{currentUser.fio}</h2>
                      <p className="text-xs text-slate-400 mt-1">{currentUser.email}</p>
                    </div>
                    <div className="text-right">
                      <div className="text-xs text-slate-400 uppercase font-semibold">Статус</div>
                      <div className="text-sm font-bold text-emerald-600 mt-0.5">Стек активен</div>
                    </div>
                  </div>

                  <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs space-y-4">
                    <div className="flex justify-between items-center pb-3 border-b border-slate-100">
                      <div>
                        <span className="text-xs text-indigo-600 font-bold uppercase tracking-wider">Текущий раздел для сдачи</span>
                        <h3 className="text-lg font-bold text-slate-800 mt-0.5">
                          {currentUser.stack === 'Flutter' ? '1. Язык Dart и базовые концепции' : '1. Язык программирования Kotlin и ООП'}
                        </h3>
                      </div>
                      <span className="px-3 py-1 rounded-full text-xs font-semibold bg-amber-50 text-amber-700 border border-amber-200">
                        В работе
                      </span>
                    </div>

                    <p className="text-xs text-slate-600">
                      Выполните практические работы по направлению {currentUser.stack} и отправьте решения на ревью эксперту.
                    </p>

                    <div className="flex items-center justify-between pt-2">
                      <button
                        onClick={() => setCurrentTab('tasks')}
                        className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold rounded-lg shadow-xs"
                      >
                        Перейти к моим заданиям ({employeeTasks.length}) →
                      </button>
                    </div>
                  </div>
                </div>

                <div className="space-y-6">
                  <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs space-y-4">
                    <h3 className="text-sm font-bold text-slate-800 uppercase tracking-wide">Прогресс матрицы</h3>
                    <div className="space-y-2">
                      <div className="flex justify-between text-xs font-semibold">
                        <span className="text-slate-700">Грейд Junior ({currentUser.stack})</span>
                        <span className="text-indigo-600">50%</span>
                      </div>
                      <div className="w-full bg-slate-100 rounded-full h-2.5">
                        <div className="bg-indigo-600 h-2.5 rounded-full" style={{ width: '50%' }}></div>
                      </div>
                    </div>
                    <button
                      onClick={() => setCurrentTab('matrix')}
                      className="w-full mt-2 py-2 bg-slate-50 hover:bg-slate-100 text-slate-700 font-semibold text-xs rounded-lg border border-slate-200"
                    >
                      Посмотреть матрицу компетенций →
                    </button>
                  </div>

                  <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs space-y-3">
                    <h3 className="text-sm font-bold text-slate-800 uppercase tracking-wide">Сводка по заданиям</h3>
                    <div className="flex justify-between text-xs py-1 border-b border-slate-50">
                      <span className="text-slate-600">Принято (Approved)</span>
                      <span className="font-bold text-emerald-600">{employeeTasks.filter((t) => t.status === 'approved').length}</span>
                    </div>
                    <div className="flex justify-between text-xs py-1 border-b border-slate-50">
                      <span className="text-slate-600">На проверке (Pending)</span>
                      <span className="font-bold text-amber-600">{employeeTasks.filter((t) => t.status === 'pending').length}</span>
                    </div>
                    <div className="flex justify-between text-xs py-1">
                      <span className="text-slate-600">Возвращено (Returned)</span>
                      <span className="font-bold text-rose-600">{employeeTasks.filter((t) => t.status === 'returned').length}</span>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </>
        )}

        {/* ============================================================ */}
        {/* СЦЕНАРИЙ 2. СОТРУДНИК: МАТРИЦА КОМПЕТЕНЦИЙ ИЗ БД             */}
        {/* ============================================================ */}
        {currentRole === 'Сотрудник' && currentTab === 'matrix' && (
          <div className="space-y-6">
            <div className="flex justify-between items-center">
              <div>
                <h2 className="text-2xl font-bold text-slate-900">
                  Матрица компетенций: {currentUser.stack}
                </h2>
                <p className="text-sm text-slate-500">
                  Дерево разделов (competency_blocks) и перечень требований (competencies) из базы данных
                </p>
              </div>
              <span className="text-xs font-semibold px-3 py-1 bg-indigo-50 text-indigo-700 rounded-full border border-indigo-200">
                Стек: {currentUser.stack}
              </span>
            </div>

            <div className="space-y-4">
              {employeeMatrix.map((block) => (
                <div key={block.id} className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs space-y-4">
                  <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                    <h3 className="text-lg font-bold text-slate-800">{block.name}</h3>
                    <span className="text-xs px-2.5 py-1 bg-indigo-50 text-indigo-700 rounded-md font-semibold">
                      Раздел матрицы
                    </span>
                  </div>

                  <div className="space-y-2.5">
                    {block.competencies.map((comp) => (
                      <div key={comp.id} className="bg-slate-50 p-3.5 rounded-xl border border-slate-200/80 flex items-center justify-between text-xs">
                        <div className="flex items-center space-x-3 pr-4">
                          <span className={`w-2.5 h-2.5 rounded-full flex-shrink-0 ${
                            comp.status === 'confirmed' ? 'bg-emerald-500' :
                            comp.status === 'in_progress' ? 'bg-amber-500' : 'bg-slate-300'
                          }`} />
                          <span className="font-medium text-slate-800 leading-relaxed">{comp.name}</span>
                        </div>
                        <div className="flex items-center space-x-3 flex-shrink-0">
                          <span className="px-2 py-0.5 rounded bg-white border border-slate-200 text-slate-600 font-semibold">
                            {comp.grade}
                          </span>
                          <span className={`font-semibold ${
                            comp.status === 'confirmed' ? 'text-emerald-600' :
                            comp.status === 'in_progress' ? 'text-amber-600' : 'text-slate-400'
                          }`}>
                            {comp.status === 'confirmed' && '✓ Подтвержден'}
                            {comp.status === 'in_progress' && '⏳ В процессе'}
                            {comp.status === 'not_started' && 'Не начат'}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ============================================================ */}
        {/* СЦЕНАРИЙ 3. СОТРУДНИК: МОИ ЗАДАНИЯ И СДАЧА ДОМАШКИ           */}
        {/* ============================================================ */}
        {currentRole === 'Сотрудник' && currentTab === 'tasks' && !selectedTask && (
          <div className="space-y-6">
            <div>
              <h2 className="text-2xl font-bold text-slate-900">Мои практические задания ({currentUser.stack})</h2>
              <p className="text-sm text-slate-500">Задания для проверки экспертом (лимит: 2 попытки)</p>
            </div>

            <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-200 text-xs font-semibold text-slate-500 uppercase">
                    <th className="px-6 py-4">Компетенция</th>
                    <th className="px-6 py-4">Практическая работа</th>
                    <th className="px-6 py-4">Попытки</th>
                    <th className="px-6 py-4">Статус</th>
                    <th className="px-6 py-4 text-right">Действие</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-sm">
                  {employeeTasks.map((task) => (
                    <tr key={task.id} className="hover:bg-slate-50/70 transition-colors">
                      <td className="px-6 py-4 font-medium text-slate-700 max-w-xs">{task.competency}</td>
                      <td className="px-6 py-4 text-slate-900 font-semibold">{task.title}</td>
                      <td className="px-6 py-4">
                        <span className="text-xs px-2 py-0.5 rounded bg-slate-100 text-slate-600 font-medium">
                          {task.attemptsUsed} из {task.maxAttempts}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        {task.status === 'approved' && <span className="px-2.5 py-1 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">✓ Зачтено</span>}
                        {task.status === 'pending' && <span className="px-2.5 py-1 rounded-full text-xs font-semibold bg-amber-50 text-amber-700 border border-amber-200">⏳ На проверке</span>}
                        {task.status === 'returned' && <span className="px-2.5 py-1 rounded-full text-xs font-semibold bg-rose-50 text-rose-700 border border-rose-200">✕ На доработке</span>}
                        {task.status === 'not_started' && <span className="px-2.5 py-1 rounded-full text-xs font-semibold bg-slate-100 text-slate-500">Не начато</span>}
                      </td>
                      <td className="px-6 py-4 text-right">
                        <button
                          onClick={() => setSelectedTask(task)}
                          className="px-3.5 py-1.5 text-xs font-medium bg-indigo-50 hover:bg-indigo-100 text-indigo-600 rounded-lg transition-colors"
                        >
                          Открыть карточку →
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* ДЕТАЛИ ЗАДАНИЯ И ПЕРЕСДАЧА */}
        {currentRole === 'Сотрудник' && currentTab === 'tasks' && selectedTask && (
          <div className="space-y-6">
            <button
              onClick={() => setSelectedTask(null)}
              className="text-xs font-semibold text-indigo-600 hover:text-indigo-800"
            >
              ← Вернуться к списку заданий
            </button>

            <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs space-y-5">
              <div>
                <span className="text-xs font-bold text-indigo-600 uppercase">{selectedTask.topic}</span>
                <h2 className="text-2xl font-bold text-slate-900 mt-1">{selectedTask.title}</h2>
                <p className="text-xs text-slate-500 mt-1">Компетенция: {selectedTask.competency}</p>
              </div>

              <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 text-sm space-y-2">
                <div className="font-semibold text-slate-800">Описание задачи:</div>
                <p className="text-slate-600">{selectedTask.description}</p>
              </div>

              {/* История попыток и вердикт эксперта */}
              {selectedTask.submissions && selectedTask.submissions.length > 0 && (
                <div className="space-y-3 pt-2">
                  <h4 className="text-xs font-bold text-slate-700 uppercase">История сдач и замечания эксперта:</h4>
                  {selectedTask.submissions.map((sub, i) => (
                    <div key={i} className={`p-4 rounded-xl border ${
                      sub.verdict === 'approved' ? 'bg-emerald-50/70 border-emerald-200' :
                      sub.verdict === 'returned' ? 'bg-rose-50/70 border-rose-200' : 'bg-amber-50/70 border-amber-200'
                    }`}>
                      <div className="flex justify-between items-center text-xs font-bold">
                        <span>Попытка № {sub.attemptNumber} ({sub.date})</span>
                        <span className={
                          sub.verdict === 'approved' ? 'text-emerald-700' :
                          sub.verdict === 'returned' ? 'text-rose-700' : 'text-amber-700'
                        }>
                          {sub.verdict === 'approved' && '✓ Принято экспертом'}
                          {sub.verdict === 'returned' && '✕ Возвращено на доработку'}
                          {sub.verdict === 'pending' && '⏳ Ожидает проверки'}
                        </span>
                      </div>
                      <div className="text-xs text-slate-600 mt-1">
                        <strong>Ссылка на PR:</strong> <a href={sub.link} target="_blank" rel="noreferrer" className="text-indigo-600 underline">{sub.link}</a>
                      </div>
                      {sub.comment && <div className="text-xs text-slate-600 mt-1"><strong>Ваш комментарий:</strong> {sub.comment}</div>}
                      {sub.expertComment && (
                        <div className="text-xs text-slate-800 mt-2 p-2 bg-white rounded-lg border border-slate-200">
                          <strong>Обратная связь эксперта:</strong> {sub.expertComment}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}

              <div className="flex items-center justify-between pt-2">
                <div className="text-xs text-slate-500">
                  Использовано попыток: <span className="font-bold text-slate-800">{selectedTask.attemptsUsed} из {selectedTask.maxAttempts}</span>
                </div>
                {selectedTask.attemptsUsed < selectedTask.maxAttempts && selectedTask.status !== 'approved' && selectedTask.status !== 'pending' && (
                  <button
                    onClick={() => setIsSubmitModalOpen(true)}
                    className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white font-medium text-xs rounded-lg shadow-xs"
                  >
                    {selectedTask.attemptsUsed === 0 ? 'Отправить работу на проверку' : 'Переделать и отправить повторно (Попытка 2)'}
                  </button>
                )}
                {selectedTask.status === 'pending' && (
                  <span className="text-xs font-semibold px-3 py-1.5 rounded-lg bg-amber-50 text-amber-700 border border-amber-200">
                    Решение находится на проверке у эксперта
                  </span>
                )}
                {selectedTask.status === 'approved' && (
                  <span className="text-xs font-semibold px-3 py-1.5 rounded-lg bg-emerald-50 text-emerald-700 border border-emerald-200">
                    ✓ Задание зачтено!
                  </span>
                )}
              </div>
            </div>
          </div>
        )}

        {/* ============================================================ */}
        {/* СЦЕНАРИЙ 4. ЭКСПЕРТ: ОЧЕРЕДЬ РЕВЬЮ (ПРИНЯТЬ / ОТКЛОНИТЬ)     */}
        {/* ============================================================ */}
        {currentRole === 'Эксперт' && currentTab === 'reviews' && (
          <div className="space-y-6">
            <div>
              <h2 className="text-2xl font-bold text-slate-900">Очередь ревью практических работ</h2>
              <p className="text-sm text-slate-500">Работы сотрудников со статусом pending, ожидающие проверки (COMP-29)</p>
            </div>

            <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
              {pendingReviews.length > 0 ? (
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-slate-50 border-b border-slate-200 text-xs font-semibold text-slate-500 uppercase">
                      <th className="px-6 py-4">Сотрудник</th>
                      <th className="px-6 py-4">Стек</th>
                      <th className="px-6 py-4">Задание</th>
                      <th className="px-6 py-4">Попытка</th>
                      <th className="px-6 py-4">Ссылка на PR</th>
                      <th className="px-6 py-4 text-right">Действие</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 text-sm">
                    {pendingReviews.map((task) => {
                      const latestSub = task.submissions?.[0];
                      return (
                        <tr key={task.id} className="hover:bg-slate-50/70 transition-colors">
                          <td className="px-6 py-4 font-semibold text-slate-900">{latestSub?.authorFio || 'Иван Сотрудников'}</td>
                          <td className="px-6 py-4 font-bold text-xs text-indigo-600">{task.stack}</td>
                          <td className="px-6 py-4 text-slate-700">{task.title}</td>
                          <td className="px-6 py-4">
                            <span className="text-xs px-2 py-0.5 rounded bg-amber-50 text-amber-700 font-semibold border border-amber-200">
                              № {task.attemptsUsed}
                            </span>
                          </td>
                          <td className="px-6 py-4">
                            <a href={latestSub?.link} target="_blank" rel="noreferrer" className="text-xs font-semibold text-indigo-600 hover:text-indigo-800">
                              {latestSub?.link} ↗
                            </a>
                          </td>
                          <td className="px-6 py-4 text-right">
                            <button
                              onClick={() => { setSelectedTask(task); setIsReviewModalOpen(true); }}
                              className="px-4 py-1.5 text-xs font-semibold bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg shadow-xs"
                            >
                              Проверить работу →
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              ) : (
                <div className="p-8 text-center text-slate-500 text-sm">
                  ☕ Очередь пуста! Все отправленные решения проверены.
                </div>
              )}
            </div>
          </div>
        )}

        {/* ============================================================ */}
        {/* СЦЕНАРИЙ 5. АДМИНИСТРАТОР: РЕЕСТР И НАЗНАЧЕНИЕ СТЕКА         */}
        {/* ============================================================ */}
        {currentRole === 'Администратор' && currentTab === 'users' && (
          <div className="space-y-6">
            <div className="flex justify-between items-center">
              <div>
                <h2 className="text-2xl font-bold text-slate-900">Реестр пользователей системы</h2>
                <p className="text-sm text-slate-500">Управление учетными записями, назначение направления и блокировка (COMP-18)</p>
              </div>
            </div>

            <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-200 text-xs font-semibold text-slate-500 uppercase">
                    <th className="px-6 py-4">ФИО</th>
                    <th className="px-6 py-4">Email</th>
                    <th className="px-6 py-4">Роль</th>
                    <th className="px-6 py-4">Текущий стек</th>
                    <th className="px-6 py-4">Статус</th>
                    <th className="px-6 py-4 text-right">Действия</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-sm">
                  {users.map((u) => (
                    <tr key={u.id} className="hover:bg-slate-50/70 transition-colors">
                      <td className="px-6 py-4 font-semibold text-slate-900">{u.fio}</td>
                      <td className="px-6 py-4 text-slate-600">{u.email}</td>
                      <td className="px-6 py-4">
                        <span className="px-2.5 py-1 rounded-full text-xs font-semibold bg-slate-100 text-slate-700">
                          {u.role}
                        </span>
                      </td>
                      <td className="px-6 py-4 font-semibold">
                        {u.stack ? (
                          <span className="text-indigo-600 font-bold">{u.stack}</span>
                        ) : (
                          <span className="text-amber-700 bg-amber-50 border border-amber-200 px-2 py-0.5 rounded text-xs font-bold">
                            ⚠️ Стек не назначен
                          </span>
                        )}
                      </td>
                      <td className="px-6 py-4">
                        <span className={`text-xs px-2.5 py-1 rounded-full font-semibold ${
                          u.is_active ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' : 'bg-rose-50 text-rose-700 border border-rose-200'
                        }`}>
                          {u.is_active ? 'Активен' : 'Заблокирован'}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-right">
                        <div className="flex items-center justify-end gap-2 whitespace-nowrap">
                          {u.role === 'Сотрудник' && (
                            <button
                              onClick={() => {
                                setTargetUser(u);
                                setSelectedStackId(u.stack_id || 2);
                                setIsChangeStackModalOpen(true);
                              }}
                              className="px-3 py-1 text-xs font-bold bg-indigo-600 text-white rounded-md hover:bg-indigo-700 transition-colors shadow-xs"
                            >
                              {u.stack ? 'Сменить стек' : 'Назначить стек'}
                            </button>
                          )}
                          <button
                            onClick={() => toggleUserActive(u.id)}
                            className={`px-2.5 py-1 text-xs font-semibold rounded-md transition-colors ${
                              u.is_active ? 'bg-rose-50 text-rose-600 hover:bg-rose-100' : 'bg-emerald-50 text-emerald-600 hover:bg-emerald-100'
                            }`}
                          >
                            {u.is_active ? 'Заблокировать' : 'Разблокировать'}
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </main>

      {/* МОДАЛКА 1: НАЗНАЧЕНИЕ / СМЕНА СТЕКА (АДМИНИСТРАТОР) */}
      {isChangeStackModalOpen && targetUser && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 border border-slate-200 shadow-xl space-y-4">
            <div className="flex justify-between items-center pb-3 border-b border-slate-100">
              <div>
                <h3 className="font-bold text-base text-slate-800">
                  {targetUser.stack ? 'Смена стека' : 'Назначение стека сотруднику'}
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">Сотрудник: {targetUser.fio}</p>
              </div>
              <button onClick={() => setIsChangeStackModalOpen(false)} className="text-slate-400 hover:text-slate-600">✕</button>
            </div>
            <form onSubmit={handleSaveStack} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 uppercase mb-1">
                  Выберите технологическое направление:
                </label>
                <select
                  value={selectedStackId}
                  onChange={(e) => setSelectedStackId(Number(e.target.value))}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm outline-none bg-white font-medium"
                >
                  {REAL_STACKS.map((s) => (
                    <option key={s.id} value={s.id}>{s.name}</option>
                  ))}
                </select>
                <p className="text-xs text-slate-500 mt-2">
                  В базе данных хранятся ровно 2 направления: <strong>Android</strong> и <strong>Flutter</strong>.
                </p>
              </div>
              <div className="flex justify-end space-x-2 pt-2">
                <button
                  type="button"
                  onClick={() => setIsChangeStackModalOpen(false)}
                  className="px-4 py-2 border border-slate-200 text-slate-600 text-xs rounded-lg"
                >
                  Отмена
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-indigo-600 text-white text-xs font-semibold rounded-lg"
                >
                  Сохранить направление
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* МОДАЛКА 2: СДАЧА ДОМАШКИ (СОТРУДНИК) */}
      {isSubmitModalOpen && selectedTask && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 border border-slate-200 shadow-xl space-y-4">
            <div className="flex justify-between items-center pb-3 border-b border-slate-100">
              <h3 className="font-bold text-base text-slate-800">Отправка практической работы</h3>
              <button onClick={() => setIsSubmitModalOpen(false)} className="text-slate-400 hover:text-slate-600">✕</button>
            </div>
            <form onSubmit={handleSubmitTask} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 uppercase mb-1">Ссылка на решение (GitHub PR / Репозиторий) *</label>
                <input
                  type="url"
                  required
                  placeholder="https://github.com/webant-team/.../pull/1"
                  value={submitLink}
                  onChange={(e) => setSubmitLink(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm outline-none focus:border-indigo-600 font-mono"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-700 uppercase mb-1">Комментарий к решению</label>
                <textarea
                  rows="3"
                  placeholder="Опишите, какие архитектурные паттерны вы применили..."
                  value={submitComment}
                  onChange={(e) => setSubmitComment(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm outline-none focus:border-indigo-600"
                />
              </div>
              <div className="flex justify-end space-x-2 pt-2">
                <button
                  type="button"
                  onClick={() => setIsSubmitModalOpen(false)}
                  className="px-4 py-2 border border-slate-200 text-slate-600 text-xs rounded-lg"
                >
                  Отмена
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-indigo-600 text-white text-xs font-medium rounded-lg"
                >
                  Отправить эксперту
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* МОДАЛКА 3: РЕВЬЮ ЭКСПЕРТОМ (ПРИНЯТЬ / ОТКЛОНИТЬ) */}
      {isReviewModalOpen && selectedTask && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 border border-slate-200 shadow-xl space-y-4">
            <div className="flex justify-between items-center pb-3 border-b border-slate-100">
              <h3 className="font-bold text-base text-slate-800">Проверка решения экспертом</h3>
              <button onClick={() => setIsReviewModalOpen(false)} className="text-slate-400 hover:text-slate-600">✕</button>
            </div>

            <div className="p-3 bg-slate-50 rounded-lg text-xs space-y-1">
              <div><span className="font-semibold">Сотрудник:</span> {selectedTask.submissions?.[0]?.authorFio}</div>
              <div><span className="font-semibold">Задание:</span> {selectedTask.title}</div>
              <div>
                <span className="font-semibold">Ссылка на PR:</span>{' '}
                <a href={selectedTask.submissions?.[0]?.link} target="_blank" rel="noreferrer" className="text-indigo-600 underline font-mono">
                  {selectedTask.submissions?.[0]?.link}
                </a>
              </div>
              {selectedTask.submissions?.[0]?.comment && (
                <div className="text-slate-500 italic mt-1">«{selectedTask.submissions[0].comment}»</div>
              )}
            </div>

            <form onSubmit={handleReviewSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 uppercase mb-2">Вердикт проверки *</label>
                <div className="grid grid-cols-2 gap-3">
                  <button
                    type="button"
                    onClick={() => setReviewVerdict('approved')}
                    className={`py-2 text-xs font-bold rounded-lg border transition-colors ${
                      reviewVerdict === 'approved'
                        ? 'bg-emerald-600 text-white border-emerald-600 shadow-xs'
                        : 'border-slate-300 text-slate-700 hover:bg-slate-50'
                    }`}
                  >
                    ✓ Принять (Approved)
                  </button>
                  <button
                    type="button"
                    onClick={() => setReviewVerdict('returned')}
                    className={`py-2 text-xs font-bold rounded-lg border transition-colors ${
                      reviewVerdict === 'returned'
                        ? 'bg-rose-600 text-white border-rose-600 shadow-xs'
                        : 'border-slate-300 text-slate-700 hover:bg-slate-50'
                    }`}
                  >
                    ✕ На доработку (Returned)
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 uppercase mb-1">
                  Замечания эксперта к коду *
                </label>
                <textarea
                  rows="3"
                  required
                  placeholder={
                    reviewVerdict === 'approved'
                      ? 'Архитектура чистая, соблюдены SOLID и Null Safety. Задание принято!'
                      : 'Переделайте обработку ошибок через Result и изолируйте бизнес-логику.'
                  }
                  value={reviewComment}
                  onChange={(e) => setReviewComment(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm outline-none focus:border-indigo-600"
                />
              </div>

              <div className="flex justify-end space-x-2 pt-2">
                <button
                  type="button"
                  onClick={() => setIsReviewModalOpen(false)}
                  className="px-4 py-2 border border-slate-200 text-slate-600 text-xs rounded-lg"
                >
                  Отмена
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-indigo-600 text-white text-xs font-semibold rounded-lg shadow-xs"
                >
                  Выставить вердикт
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}