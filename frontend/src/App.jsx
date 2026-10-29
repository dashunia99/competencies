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
    fio: 'Иванов Иван',
    email: 'employee@webant.ru',
    password: 'employee123password',
    role: 'Сотрудник',
    stack_id: null, // До назначения админом — без стека и программы
    stack: null,
    grade: 'Junior',
    is_active: true,
    startDate: '01.09.2026'
  }
];

// 3-уровневая структура программ обучения, соответствующая матрице компетенций:
// Тема (Level 1) -> Подтема (Level 2) -> Раздел/Компетенция (Level 3) -> Материалы + Задания
const LEARNING_PROGRAMS = {
  Flutter: {
    title: 'Программа «Flutter: стажировка»',
    themes: [
      {
        id: 'fl-t1',
        title: 'Тема 1. Язык Dart и базовые концепции',
        subthemes: [
          {
            id: 'fl-st1-1',
            number: '1.1',
            title: 'Основы ООП в Dart',
            planTime: '4 ч',
            status: 'Принято',
            sections: [
              {
                id: 'fl-sec-1-1-1',
                number: '1.1.1',
                title: 'Инкапсуляция и приватные поля в библиотеках Dart',
                competency: 'Инкапсуляция и структуры данных в Dart',
                planTime: '2 ч',
                status: 'Принято',
                description: 'Изучите принципы сокрытия состояния в Dart с использованием приватных полей (префикс _) на уровне библиотек и файлов.',
                taskCondition: 'Опишите класс User с приватными полями (_id, _email, _token), геттерами для безопасного чтения и фабричным конструктором fromJson.',
                rules: 'Ветка: feature/dart-oop-encapsulation. Результат — ссылка на Pull Request.',
                materials: [
                  { title: 'Официальная документация: Classes in Dart', url: 'https://dart.dev/language/classes' },
                  { title: 'Dart Tour: Libraries and visibility', url: 'https://dart.dev/language/libraries' }
                ],
                taskId: 101
              },
              {
                id: 'fl-sec-1-1-2',
                number: '1.1.2',
                title: 'Наследование, миксины (mixins) и интерфейсы',
                competency: 'Полиморфизм и композиция через mixins в Dart',
                planTime: '2 ч',
                status: 'Принято',
                description: 'Понимание множественного поведения через mixin (with) и контрактов через implements.',
                taskCondition: 'Спроектируйте базовый класс BaseRepository и миксин NetworkLoggerMixin для автоматического логирования сетевых запросов.',
                rules: 'Ветка: feature/dart-mixins. Результат — ссылка на merge request.',
                materials: [
                  { title: 'Официальное руководство: Mixins in Dart', url: 'https://dart.dev/language/mixins' }
                ],
                taskId: 102
              }
            ]
          },
          {
            id: 'fl-st1-2',
            number: '1.2',
            title: 'Асинхронность и реактивные потоки',
            planTime: '6 ч',
            status: 'Возвращено',
            sections: [
              {
                id: 'fl-sec-1-2-1',
                number: '1.2.1',
                title: 'Потоки Stream, StreamController и обработка ошибок',
                competency: 'Реактивное программирование на Stream в Dart',
                planTime: '3 ч',
                status: 'Возвращено',
                description: 'Потоковая передача данных, трансформация потоков (map, where, asyncMap) и корректная отписка для предотвращения утечек памяти.',
                taskCondition: 'Создайте утилиту EventBus с возможностью фильтрации событий по типу и широковещательным потоком (broadcast).',
                rules: 'Ветка: feature/dart-stream-bus. Результат — ссылка на merge request.',
                materials: [
                  { title: 'Официальная документация: Asynchronous programming: Streams', url: 'https://dart.dev/tutorials/language/streams' },
                  { title: 'Flutter Dev: Working with Streams', url: 'https://docs.flutter.dev/data-and-backend/state-mgmt/options#streams' }
                ],
                taskId: 103
              }
            ]
          }
        ]
      },
      {
        id: 'fl-t2',
        title: 'Тема 2. Flutter Framework и State Management',
        subthemes: [
          {
            id: 'fl-st2-1',
            number: '2.1',
            title: 'Архитектурный паттерн Bloc / Cubit',
            planTime: '4 ч',
            status: 'На проверке',
            sections: [
              {
                id: 'fl-sec-2-1-1',
                number: '2.1.1',
                title: 'Single Responsibility и разделение Events / States',
                competency: 'Управление состоянием: Bloc / Cubit, события и состояния',
                planTime: '4 ч',
                status: 'На проверке',
                description: 'Разделение бизнес-логики и UI на базе flutter_bloc. Корректная обработка состояний Loading, Success, Failure.',
                taskCondition: 'Реализуйте экран авторизации с валидацией полей, показом индикатора загрузки и обработкой сетевой ошибки через Cubit.',
                rules: 'Ветка: feature/auth-bloc-cubit. Результат — ссылка на pull request.',
                materials: [
                  { title: 'Официальный сайт Bloc Library: Core Concepts', url: 'https://bloclibrary.dev/#/coreconcepts' },
                  { title: 'Flutter Documentation: State management options', url: 'https://docs.flutter.dev/data-and-backend/state-mgmt/options' }
                ],
                taskId: 104
              }
            ]
          },
          {
            id: 'fl-st2-2',
            number: '2.2',
            title: 'Сетевой стек и локальное хранилище',
            planTime: '3 ч',
            status: 'Не начато',
            sections: [
              {
                id: 'fl-sec-2-2-1',
                number: '2.2.1',
                title: 'Клиент Dio, перехватчики токенов и кэш Hive',
                competency: 'Сетевой слой Dio и хранение в Hive',
                planTime: '3 ч',
                status: 'Не начато',
                description: 'Интеграция сетевого клиента Dio с добавлением Auth Interceptor (автоподстановка Bearer токена) и локального кэша.',
                taskCondition: 'Настроить перехватчик ошибки 401 для вызова логаута и сохранить профиль пользователя в зашифрованный Hive box.',
                rules: 'Ветка: feature/network-dio-hive. Результат — ссылка на merge request.',
                materials: [
                  { title: 'Пакет Dio: Interceptors documentation', url: 'https://pub.dev/packages/dio#interceptors' },
                  { title: 'Официальный гайд Hive DB', url: 'https://docs.hivedb.dev/' }
                ],
                taskId: 105
              }
            ]
          }
        ]
      }
    ]
  },
  Android: {
    title: 'Программа «Android: стажировка»',
    themes: [
      {
        id: 'an-t1',
        title: 'Тема 1. Язык Kotlin и принципы ООП',
        subthemes: [
          {
            id: 'an-st1-1',
            number: '1.1',
            title: 'Объектно-ориентированное проектирование',
            planTime: '4 ч',
            status: 'Принято',
            sections: [
              {
                id: 'an-sec-1-1-1',
                number: '1.1.1',
                title: 'Инкапсуляция, Data-классы и Sealed Interfaces',
                competency: 'ООП: интерфейсы, sealed classes и инкапсуляция',
                planTime: '2 ч',
                status: 'Принято',
                description: 'Изучите моделирование предметной области на Kotlin с использованием закрытых иерархий и иммутабельных данных.',
                taskCondition: 'Опишите модель ответов сетевого слоя через sealed interface NetworkResult<T> с ветками Success, HttpError и ConnectionError.',
                rules: 'Ветка: feature/kotlin-oop-result. Результат — ссылка на pull request.',
                materials: [
                  { title: 'Официальная документация Kotlin: Sealed classes and interfaces', url: 'https://kotlinlang.org/docs/sealed-classes.html' },
                  { title: 'Kotlin Docs: Data classes', url: 'https://kotlinlang.org/docs/data-classes.html' }
                ],
                taskId: 201
              }
            ]
          },
          {
            id: 'an-st1-2',
            number: '1.2',
            title: 'Архитектурные принципы SOLID',
            planTime: '4 ч',
            status: 'Возвращено',
            sections: [
              {
                id: 'an-sec-1-2-1',
                number: '1.2.1',
                title: 'Single Responsibility и Dependency Inversion в Android',
                competency: 'Принципы SOLID в мобильной разработке',
                planTime: '3 ч',
                status: 'Возвращено',
                description: 'Изоляция логики приложения от фреймворка Android и внедрение зависимостей.',
                taskCondition: 'Разделите класс валидатора и класс отправки формы. Внедрите интерфейс через конструктор.',
                rules: 'Ветка: feature/solid-architecture. Результат — ссылка на pull request.',
                materials: [
                  { title: 'Android Developers: Guide to app architecture', url: 'https://developer.android.com/topic/architecture' }
                ],
                taskId: 202
              }
            ]
          }
        ]
      },
      {
        id: 'an-t2',
        title: 'Тема 2. Архитектура Android-приложений',
        subthemes: [
          {
            id: 'an-st2-1',
            number: '2.1',
            title: 'Паттерн MVVM и StateFlow',
            planTime: '4 ч',
            status: 'На проверке',
            sections: [
              {
                id: 'an-sec-2-1-1',
                number: '2.1.1',
                title: 'Управление UI-состоянием во ViewModel',
                competency: 'Архитектурный паттерн MVVM и ViewModel',
                planTime: '4 ч',
                status: 'На проверке',
                description: 'Реализация реактивного экрана со списком элементов с использованием StateFlow и Sealed UI-state.',
                taskCondition: 'Создать экран списка заметок на MVVM. Бизнес-логика фильтрации должна быть изолирована от Fragment.',
                rules: 'Ветка: feature/notes-mvvm. Результат — ссылка на pull request.',
                materials: [
                  { title: 'Официальный гайд Google: ViewModel Overview', url: 'https://developer.android.com/topic/libraries/architecture/viewmodel' },
                  { title: 'Android Developers: StateFlow and SharedFlow', url: 'https://developer.android.com/kotlin/flow/stateflow-and-sharedflow' }
                ],
                taskId: 203
              }
            ]
          },
          {
            id: 'an-st2-2',
            number: '2.2',
            title: 'Работа с сетью и базой данных',
            planTime: '3 ч',
            status: 'Не начато',
            sections: [
              {
                id: 'an-sec-2-2-1',
                number: '2.2.1',
                title: 'Сетевой стек Retrofit и база Room',
                competency: 'Сетевой стек: Retrofit, OkHttp и Room',
                planTime: '3 ч',
                status: 'Не начато',
                description: 'Настройка связки Retrofit + OkHttp с локальным кэшированием сущностей в базе данных Room.',
                taskCondition: 'Настроить перехват ошибок 401 через OkHttp Interceptor и сохранение списка постов в Room DAO.',
                rules: 'Ветка: feature/retrofit-room. Результат — ссылка на pull request.',
                materials: [
                  { title: 'Square Retrofit: Getting started', url: 'https://square.github.io/retrofit/' },
                  { title: 'Android Developers: Save data in a local database using Room', url: 'https://developer.android.com/training/data-storage/room' }
                ],
                taskId: 204
              }
            ]
          }
        ]
      }
    ]
  }
};

// Реальные матрицы из БД
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

// Практические задания с историей сдач и статусами
const INITIAL_TASKS = [
  {
    id: 101,
    stack: 'Flutter',
    number: '1.1.1',
    title: 'Инкапсуляция и приватные поля в библиотеках Dart',
    competency: 'Инкапсуляция и структуры данных в Dart',
    planTime: '2 ч',
    status: 'approved',
    attemptsUsed: 1,
    maxAttempts: 2,
    description: 'Изучите принципы сокрытия состояния в Dart с использованием приватных полей (префикс _) на уровне библиотек и файлов.',
    taskCondition: 'Опишите класс User с приватными полями (_id, _email, _token), геттерами для безопасного чтения и фабричным конструктором fromJson.',
    rules: 'Ветка: feature/dart-oop-encapsulation. Результат — ссылка на Pull Request.',
    materials: [
      { title: 'Официальная документация: Classes in Dart', url: 'https://dart.dev/language/classes' },
      { title: 'Dart Tour: Libraries and visibility', url: 'https://dart.dev/language/libraries' }
    ],
    submissions: [
      {
        id: 1,
        attemptNumber: 1,
        authorFio: 'Иванов Иван',
        date: 'Вчера, 14:30',
        link: 'https://github.com/webant/flutter-user/pull/1',
        comment: 'Реализовал инкапсуляцию и фабричный конструктор.',
        verdict: 'approved',
        expertComment: 'Отличная реализация, инкапсуляция соблюдена корректно.'
      }
    ]
  },
  {
    id: 102,
    stack: 'Flutter',
    number: '1.1.2',
    title: 'Наследование, миксины (mixins) и интерфейсы',
    competency: 'Полиморфизм и композиция через mixins в Dart',
    planTime: '2 ч',
    status: 'approved',
    attemptsUsed: 1,
    maxAttempts: 2,
    description: 'Понимание множественного поведения через mixin (with) и контрактов через implements.',
    taskCondition: 'Спроектируйте базовый класс BaseRepository и миксин NetworkLoggerMixin для автоматического логирования сетевых запросов.',
    rules: 'Ветка: feature/dart-mixins. Результат — ссылка на merge request.',
    materials: [
      { title: 'Официальное руководство: Mixins in Dart', url: 'https://dart.dev/language/mixins' }
    ],
    submissions: [
      {
        id: 2,
        attemptNumber: 1,
        authorFio: 'Иванов Иван',
        date: 'Вчера, 17:15',
        link: 'https://github.com/webant/flutter-mixins/pull/3',
        comment: 'Добавил миксин логгера для репозиториев.',
        verdict: 'approved',
        expertComment: 'Зачтено. Mixin применен по назначению.'
      }
    ]
  },
  {
    id: 103,
    stack: 'Flutter',
    number: '1.2.1',
    title: 'Потоки Stream, StreamController и обработка ошибок',
    competency: 'Реактивное программирование на Stream в Dart',
    planTime: '3 ч',
    status: 'returned',
    attemptsUsed: 1,
    maxAttempts: 2,
    description: 'Потоковая передача данных, трансформация потоков (map, where, asyncMap) и корректная отписка для предотвращения утечек памяти.',
    taskCondition: 'Создайте утилиту EventBus с возможностью фильтрации событий по типу и широковещательным потоком (broadcast).',
    rules: 'Ветка: feature/dart-stream-bus. Результат — ссылка на merge request.',
    materials: [
      { title: 'Официальная документация: Asynchronous programming: Streams', url: 'https://dart.dev/tutorials/language/streams' },
      { title: 'Flutter Dev: Working with Streams', url: 'https://docs.flutter.dev/data-and-backend/state-mgmt/options#streams' }
    ],
    submissions: [
      {
        id: 3,
        attemptNumber: 1,
        authorFio: 'Иванов Иван',
        date: 'Сегодня, 09:20',
        link: 'https://github.com/webant/dart-eventbus/pull/5',
        comment: 'Реализовал базовый EventBus на базе StreamController.broadcast.',
        verdict: 'returned',
        expertComment: 'При повторном вызове не закрывается предыдущий контроллер. Исправьте утечку памяти и отправьте повторно (попытка 2).'
      }
    ]
  },
  {
    id: 104,
    stack: 'Flutter',
    number: '2.1.1',
    title: 'Single Responsibility и разделение Events / States',
    competency: 'Управление состоянием: Bloc / Cubit, события и состояния',
    planTime: '4 ч',
    status: 'pending',
    attemptsUsed: 1,
    maxAttempts: 2,
    description: 'Разделение бизнес-логики и UI на базе flutter_bloc. Корректная обработка состояний Loading, Success, Failure.',
    taskCondition: 'Реализуйте экран авторизации с валидацией полей, показом индикатора загрузки и обработкой сетевой ошибки через Cubit.',
    rules: 'Ветка: feature/auth-bloc-cubit. Результат — ссылка на pull request.',
    materials: [
      { title: 'Официальный сайт Bloc Library: Core Concepts', url: 'https://bloclibrary.dev/#/coreconcepts' },
      { title: 'Flutter Documentation: State management options', url: 'https://docs.flutter.dev/data-and-backend/state-mgmt/options' }
    ],
    submissions: [
      {
        id: 4,
        attemptNumber: 1,
        authorFio: 'Иванов Иван',
        date: 'Сегодня, 11:45',
        link: 'https://github.com/webant/flutter-auth-bloc/pull/2',
        comment: 'Изолировал стейты AuthInitial, AuthLoading, AuthSuccess, AuthFailure. Ожидаю ревью.',
        verdict: 'pending',
        expertComment: ''
      }
    ]
  },
  {
    id: 105,
    stack: 'Flutter',
    number: '2.2.1',
    title: 'Клиент Dio, перехватчики токенов и кэш Hive',
    competency: 'Сетевой слой Dio и хранение в Hive',
    planTime: '3 ч',
    status: 'not_started',
    attemptsUsed: 0,
    maxAttempts: 2,
    description: 'Интеграция сетевого клиента Dio с добавлением Auth Interceptor (автоподстановка Bearer токена) и локального кэша.',
    taskCondition: 'Настроить перехватчик ошибки 401 для вызова логаута и сохранить профиль пользователя в зашифрованный Hive box.',
    rules: 'Ветка: feature/network-dio-hive. Результат — ссылка на merge request.',
    materials: [
      { title: 'Пакет Dio: Interceptors documentation', url: 'https://pub.dev/packages/dio#interceptors' },
      { title: 'Официальный гайд Hive DB', url: 'https://docs.hivedb.dev/' }
    ],
    submissions: []
  },
  {
    id: 201,
    stack: 'Android',
    number: '1.1.1',
    title: 'Инкапсуляция, Data-классы и Sealed Interfaces',
    competency: 'ООП: интерфейсы, sealed classes и инкапсуляция',
    planTime: '2 ч',
    status: 'approved',
    attemptsUsed: 1,
    maxAttempts: 2,
    description: 'Изучите моделирование предметной области на Kotlin с использованием закрытых иерархий и иммутабельных данных.',
    taskCondition: 'Опишите модель ответов сетевого слоя через sealed interface NetworkResult<T> с ветками Success, HttpError и ConnectionError.',
    rules: 'Ветка: feature/kotlin-oop-result. Результат — ссылка на pull request.',
    materials: [
      { title: 'Официальная документация Kotlin: Sealed classes and interfaces', url: 'https://kotlinlang.org/docs/sealed-classes.html' },
      { title: 'Kotlin Docs: Data classes', url: 'https://kotlinlang.org/docs/data-classes.html' }
    ],
    submissions: []
  },
  {
    id: 202,
    stack: 'Android',
    number: '1.2.1',
    title: 'Single Responsibility и Dependency Inversion в Android',
    competency: 'Принципы SOLID в мобильной разработке',
    planTime: '3 ч',
    status: 'returned',
    attemptsUsed: 1,
    maxAttempts: 2,
    description: 'Изоляция логики приложения от фреймворка Android и внедрение зависимостей.',
    taskCondition: 'Разделите класс валидатора и класс отправки формы. Внедрите интерфейс через конструктор.',
    rules: 'Ветка: feature/solid-architecture. Результат — ссылка на pull request.',
    materials: [
      { title: 'Android Developers: Guide to app architecture', url: 'https://developer.android.com/topic/architecture' }
    ],
    submissions: [
      {
        id: 5,
        attemptNumber: 1,
        authorFio: 'Иванов Иван',
        date: 'Вчера, 18:00',
        link: 'https://github.com/webant/android-solid/pull/1',
        comment: 'Разделил классы по SOLID.',
        verdict: 'returned',
        expertComment: 'Зависимость всё ещё создается внутри конструктора жестко через new/конструктор. Используйте внедрение зависимости.'
      }
    ]
  },
  {
    id: 203,
    stack: 'Android',
    number: '2.1.1',
    title: 'Управление UI-состоянием во ViewModel',
    competency: 'Архитектурный паттерн MVVM и ViewModel',
    planTime: '4 ч',
    status: 'pending',
    attemptsUsed: 1,
    maxAttempts: 2,
    description: 'Реализация реактивного экрана со списком элементов с использованием StateFlow и Sealed UI-state.',
    taskCondition: 'Создать экран списка заметок на MVVM. Бизнес-логика фильтрации должна быть изолирована от Fragment.',
    rules: 'Ветка: feature/notes-mvvm. Результат — ссылка на pull request.',
    materials: [
      { title: 'Официальный гайд Google: ViewModel Overview', url: 'https://developer.android.com/topic/libraries/architecture/viewmodel' }
    ],
    submissions: [
      {
        id: 6,
        attemptNumber: 1,
        authorFio: 'Иванов Иван',
        date: 'Сегодня, 10:10',
        link: 'https://github.com/webant/android-notes-mvvm/pull/4',
        comment: 'Изолировал фильтрацию во ViewModel через StateFlow.',
        verdict: 'pending',
        expertComment: ''
      }
    ]
  },
  {
    id: 204,
    stack: 'Android',
    number: '2.2.1',
    title: 'Сетевой стек Retrofit и база Room',
    competency: 'Сетевой стек: Retrofit, OkHttp и Room',
    planTime: '3 ч',
    status: 'not_started',
    attemptsUsed: 0,
    maxAttempts: 2,
    description: 'Настройка связки Retrofit + OkHttp с локальным кэшированием сущностей в базе данных Room.',
    taskCondition: 'Настроить перехват ошибок 401 через OkHttp Interceptor и сохранение списка постов в Room DAO.',
    rules: 'Ветка: feature/retrofit-room. Результат — ссылка на pull request.',
    materials: [
      { title: 'Square Retrofit: Getting started', url: 'https://square.github.io/retrofit/' }
    ],
    submissions: []
  }
];

export default function App() {
  const [isAuth, setIsAuth] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [authError, setAuthError] = useState('');

  // Централизованное состояние пользователей и задач
  const [users, setUsers] = useState(INITIAL_USERS);
  const [currentUserId, setCurrentUserId] = useState(null);
  const [currentRole, setCurrentRole] = useState('Сотрудник');
  const [currentTab, setCurrentTab] = useState('profile'); // 'profile' | 'program' | 'tasks' | 'matrix' | 'reviews' | 'users'
  const [tasks, setTasks] = useState(INITIAL_TASKS);

  // Состояние выбранного задания и экрана
  const [selectedTask, setSelectedTask] = useState(null);
  const [taskFilter, setTaskFilter] = useState('all');

  // Модальные окна
  const [isSubmitModalOpen, setIsSubmitModalOpen] = useState(false);
  const [submitLink, setSubmitLink] = useState('');
  const [submitComment, setSubmitComment] = useState('');

  const [isReviewModalOpen, setIsReviewModalOpen] = useState(false);
  const [reviewVerdict, setReviewVerdict] = useState('approved');
  const [reviewComment, setReviewComment] = useState('');

  const [isChangeStackModalOpen, setIsChangeStackModalOpen] = useState(false);
  const [targetUser, setTargetUser] = useState(null);
  const [selectedStackId, setSelectedStackId] = useState(2); // по дефолту Flutter

  // Актуальный объект текущего пользователя
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

  // Перевод задания в статус "В работе" (кнопка на экране 05)
  const handleStartTask = (taskId) => {
    setTasks((prev) =>
      prev.map((t) => (t.id === taskId ? { ...t, status: 'in_progress' } : t))
    );
    setSelectedTask((prev) => (prev ? { ...prev, status: 'in_progress' } : null));
  };

  // 2. СОТРУДНИК: Отправка домашки (сдача / пересдача)
  const handleSubmitTask = (e) => {
    e.preventDefault();
    if (!selectedTask || !submitLink.trim()) return;

    const newSub = {
      id: Date.now(),
      attemptNumber: selectedTask.attemptsUsed + 1,
      authorFio: currentUser.fio,
      date: 'Сегодня, ' + new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
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

  // Фильтрованные данные под активный стек
  const currentProgram = currentUser.stack ? LEARNING_PROGRAMS[currentUser.stack] : null;
  const employeeMatrix = currentUser.stack ? MATRICES[currentUser.stack] || [] : [];
  const employeeTasks = currentUser.stack ? tasks.filter((t) => t.stack === currentUser.stack) : [];
  const pendingReviews = tasks.filter((t) => t.status === 'pending');

  // Фильтрация в табе "Мои задания"
  const filteredTasks = employeeTasks.filter((t) => {
    if (taskFilter === 'all') return true;
    if (taskFilter === 'in_progress') return t.status === 'in_progress';
    if (taskFilter === 'pending') return t.status === 'pending';
    if (taskFilter === 'approved') return t.status === 'approved';
    if (taskFilter === 'returned') return t.status === 'returned';
    return true;
  });

  // Вспомогательная функция для открытия задания по ID из дерева программы
  const openTaskFromSection = (taskId) => {
    const found = tasks.find((t) => t.id === taskId);
    if (found) {
      setSelectedTask(found);
      setCurrentTab('task_detail');
    }
  };

  // ЭКРАН 1: ВХОД (СТРОГО 3 РОЛИ)
  if (!isAuth) {
    return (
      <div className="min-h-screen bg-slate-100 flex items-center justify-center p-4">
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
    <div className="min-h-screen bg-[#f5f6f8] flex flex-col font-sans text-slate-800">
      {/* ======================================================== */}
      {/* ВЕРХНЯЯ ШАПКА В ТОЧНОСТИ КАК НА МАКЕТАХ 026 / 03 / 05    */}
      {/* ======================================================== */}
      <header className="bg-white border-b border-slate-200 sticky top-0 z-30">
        <div className="max-w-6xl mx-auto px-6 h-16 flex items-center justify-between">
          <div className="flex items-center space-x-8">
            <div className="flex items-center space-x-2">
              <span className="font-bold text-slate-900 tracking-tight text-base">Компетенции</span>
            </div>

            {/* Навигация Сотрудника (как на Скриншоте 2 и 3) */}
            {currentRole === 'Сотрудник' && (
              <nav className="flex space-x-6 text-sm">
                <button
                  onClick={() => { setCurrentTab('profile'); setSelectedTask(null); }}
                  className={`font-medium transition-colors ${
                    currentTab === 'profile' ? 'text-slate-900 font-bold border-b-2 border-slate-900 py-5' : 'text-slate-500 hover:text-slate-900 py-5'
                  }`}
                >
                  Кабинет
                </button>
                <button
                  onClick={() => {
                    if (!currentUser.stack) {
                      alert('Программа пока не назначена администратором.');
                      return;
                    }
                    setCurrentTab('program');
                    setSelectedTask(null);
                  }}
                  className={`font-medium transition-colors ${
                    currentTab === 'program' ? 'text-slate-900 font-bold border-b-2 border-slate-900 py-5' : 'text-slate-500 hover:text-slate-900 py-5'
                  }`}
                >
                  Программа
                </button>
                <button
                  onClick={() => {
                    if (!currentUser.stack) {
                      alert('Стек пока не назначен администратором.');
                      return;
                    }
                    setCurrentTab('tasks');
                    setSelectedTask(null);
                  }}
                  className={`font-medium transition-colors ${
                    currentTab === 'tasks' ? 'text-slate-900 font-bold border-b-2 border-slate-900 py-5' : 'text-slate-500 hover:text-slate-900 py-5'
                  }`}
                >
                  Мои задания
                </button>
                <button
                  onClick={() => {
                    if (!currentUser.stack) {
                      alert('Стек пока не назначен администратором.');
                      return;
                    }
                    setCurrentTab('matrix');
                    setSelectedTask(null);
                  }}
                  className={`font-medium transition-colors ${
                    currentTab === 'matrix' ? 'text-slate-900 font-bold border-b-2 border-slate-900 py-5' : 'text-slate-500 hover:text-slate-900 py-5'
                  }`}
                >
                  Матрица
                </button>
              </nav>
            )}

            {/* Навигация Эксперта */}
            {currentRole === 'Эксперт' && (
              <nav className="flex space-x-6 text-sm">
                <button
                  onClick={() => { setCurrentTab('reviews'); setSelectedTask(null); }}
                  className={`font-medium transition-colors ${
                    currentTab === 'reviews' ? 'text-slate-900 font-bold border-b-2 border-slate-900 py-5' : 'text-slate-500 hover:text-slate-900 py-5'
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
              <nav className="flex space-x-6 text-sm">
                <button
                  onClick={() => { setCurrentTab('users'); setSelectedTask(null); }}
                  className={`font-medium transition-colors ${
                    currentTab === 'users' ? 'text-slate-900 font-bold border-b-2 border-slate-900 py-5' : 'text-slate-500 hover:text-slate-900 py-5'
                  }`}
                >
                  Управление сотрудниками
                </button>
              </nav>
            )}
          </div>

          {/* Правая часть: имя, переключение ролей и кнопка Выйти */}
          <div className="flex items-center space-x-5 text-sm">
            <div className="flex items-center bg-slate-100 p-1 rounded-lg border border-slate-200">
              <span className="text-[11px] font-semibold text-slate-500 px-2">Роль:</span>
              {users.map((u) => (
                <button
                  key={u.id}
                  onClick={() => handleQuickLogin(u)}
                  className={`px-2 py-0.5 text-xs rounded transition-colors ${
                    currentUser.id === u.id
                      ? 'bg-white text-indigo-600 font-bold shadow-xs'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  {u.role}
                </button>
              ))}
            </div>

            <span className="text-slate-700 font-medium">{currentUser.fio}</span>
            <button
              onClick={handleLogout}
              className="text-slate-500 hover:text-slate-900 transition-colors"
            >
              Выйти
            </button>
          </div>
        </div>
      </header>

      {/* ОСНОВНОЙ КОНТЕНТ */}
      <main className="flex-1 max-w-6xl w-full mx-auto p-8 space-y-6">

        {/* ======================================================== */}
        {/* 1. ЛИЧНЫЙ КАБИНЕТ СОТРУДНИКА (СТРОГО КАК НА СКРИНШОТЕ 2) */}
        {/* ======================================================== */}
        {currentRole === 'Сотрудник' && currentTab === 'profile' && (
          <div className="space-y-6">
            <div className="text-xs text-slate-400">
              {currentUser.stack ? '02 Личный кабинет' : '02б Личный кабинет — без программы'}
            </div>

            {/* Карточка пользователя с круглым аватаром (как на скриншоте 2) */}
            <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs flex items-center space-x-5">
              <div className="w-14 h-14 bg-slate-200 rounded-full flex-shrink-0"></div>
              <div>
                <h2 className="text-lg font-bold text-slate-900">{currentUser.fio}</h2>
                <p className="text-xs text-slate-500 mt-0.5">
                  {currentUser.stack ? currentUser.stack : 'Направление не выбрано'} • {currentUser.grade} • с {currentUser.startDate}
                </p>
              </div>
            </div>

            {/* Блок «Моя программа» */}
            <div className="space-y-3">
              <h3 className="text-sm font-bold text-slate-900">Моя программа</h3>
              {!currentUser.stack ? (
                /* В точности как на Скриншоте 2 */
                <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs space-y-2">
                  <h4 className="text-sm font-bold text-slate-900">Программа обучения пока не назначена</h4>
                  <p className="text-xs text-slate-500 leading-relaxed">
                    Эксперт или администратор назначит программу. Пока можно посмотреть матрицу компетенций.
                  </p>
                </div>
              ) : (
                <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs flex items-center justify-between">
                  <div>
                    <h4 className="text-sm font-bold text-slate-900">{currentProgram?.title}</h4>
                    <p className="text-xs text-slate-500 mt-1">
                      Последовательный трек тем и практических заданий для грейда {currentUser.grade}.
                    </p>
                  </div>
                  <button
                    onClick={() => setCurrentTab('program')}
                    className="px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white text-xs font-semibold rounded-lg transition-colors"
                  >
                    Перейти к программе →
                  </button>
                </div>
              )}
            </div>

            {/* Блок «Матрица компетенций» (в точности как на Скриншоте 2) */}
            <div className="space-y-3">
              <h3 className="text-sm font-bold text-slate-900">Матрица компетенций</h3>
              <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs space-y-2">
                <div className="text-xs text-slate-500">
                  Подтверждено 12 · Не подтверждено 2 · Не оценено 20
                </div>
                <div>
                  <button
                    onClick={() => {
                      if (!currentUser.stack) {
                        alert('Сначала администратор должен назначить направление (Android или Flutter).');
                        return;
                      }
                      setCurrentTab('matrix');
                    }}
                    className="text-xs font-bold text-slate-900 hover:underline inline-flex items-center"
                  >
                    Открыть матрицу →
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ======================================================== */}
        {/* 2. ПРОГРАММА ОБУЧЕНИЯ (СТРОГО КАК НА СКРИНШОТЕ 3)        */}
        {/* 3 УРОВНЯ: ТЕМА -> ПОДТЕМА -> РАЗДЕЛ -> МАТЕРИАЛЫ/ЗАДАНИЯ */}
        {/* ======================================================== */}
        {currentRole === 'Сотрудник' && currentTab === 'program' && currentProgram && (
          <div className="space-y-6">
            <button
              onClick={() => setCurrentTab('profile')}
              className="text-xs font-semibold text-slate-500 hover:text-slate-900 flex items-center space-x-1"
            >
              <span>← В кабинет</span>
            </button>

            <h2 className="text-2xl font-bold text-slate-900">{currentProgram.title}</h2>

            <div className="space-y-6">
              {currentProgram.themes.map((theme) => (
                <div key={theme.id} className="space-y-2">
                  {/* Заголовок Темы (Уровень 1) в стиле серой плашки макета 03 */}
                  <div className="bg-[#e9ecf1] px-5 py-3 rounded-lg text-xs font-bold text-slate-800 tracking-wide">
                    ▾ {theme.title}
                  </div>

                  {/* Список Подтем (Уровень 2) */}
                  <div className="space-y-2">
                    {theme.subthemes.map((subtheme) => (
                      <div key={subtheme.id} className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-xs">
                        {/* Строка подтемы с плановым временем и статусом */}
                        <div className="px-6 py-4 flex items-center justify-between">
                          <div className="flex items-center space-x-4">
                            <span className="text-xs text-slate-400 font-medium w-6">{subtheme.number}</span>
                            <span className="text-sm font-bold text-slate-900">{subtheme.title}</span>
                          </div>
                          <div className="flex items-center space-x-4">
                            <span className="text-xs text-slate-400">план {subtheme.planTime}</span>
                            <span className={`px-3 py-1 rounded-full text-xs font-semibold ${
                              subtheme.status === 'Принято' ? 'bg-[#e7f7ed] text-[#1e8346]' :
                              subtheme.status === 'Возвращено' ? 'bg-[#fdebee] text-[#cf2a45]' :
                              subtheme.status === 'На проверке' ? 'bg-[#fef4e5] text-[#b47113]' :
                              'bg-[#f0f2f5] text-slate-600'
                            }`}>
                              {subtheme.status}
                            </span>
                          </div>
                        </div>

                        {/* Уровень 3: Разделы (компетенции) с материалами и карточками заданий */}
                        <div className="border-t border-slate-100 bg-slate-50/70 p-4 pl-12 space-y-3">
                          <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                            Разделы и практические карточки:
                          </span>
                          {subtheme.sections.map((sec) => (
                            <div key={sec.id} className="bg-white p-4 rounded-lg border border-slate-200 flex items-center justify-between">
                              <div>
                                <div className="text-xs font-bold text-slate-900">
                                  {sec.number} {sec.title}
                                </div>
                                <div className="text-[11px] text-slate-500 mt-0.5">
                                  Компетенция: {sec.competency} • {sec.materials.length} материала
                                </div>
                              </div>
                              <button
                                onClick={() => openTaskFromSection(sec.taskId)}
                                className="px-3.5 py-1.5 bg-slate-900 hover:bg-slate-800 text-white text-xs font-semibold rounded-md shadow-xs transition-colors"
                              >
                                Открыть задание →
                              </button>
                            </div>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ======================================================== */}
        {/* 3. КАРТОЧКА ЗАДАНИЯ (СТРОГО КАК НА СКРИНШОТЕ 4)          */}
        {/* ======================================================== */}
        {currentRole === 'Сотрудник' && (currentTab === 'task_detail' || (currentTab === 'tasks' && selectedTask)) && selectedTask && (
          <div className="space-y-6">
            <button
              onClick={() => { setSelectedTask(null); setCurrentTab('program'); }}
              className="text-xs font-semibold text-slate-500 hover:text-slate-900 flex items-center space-x-1"
            >
              <span>← К программе</span>
            </button>

            <div className="flex items-center justify-between">
              <h2 className="text-2xl font-bold text-slate-900">
                {selectedTask.number} {selectedTask.title}
              </h2>
              <span className={`px-3 py-1 rounded-full text-xs font-semibold ${
                selectedTask.status === 'approved' ? 'bg-[#e7f7ed] text-[#1e8346]' :
                selectedTask.status === 'returned' ? 'bg-[#fdebee] text-[#cf2a45]' :
                selectedTask.status === 'pending' ? 'bg-[#fef4e5] text-[#b47113]' :
                selectedTask.status === 'in_progress' ? 'bg-[#e8f0fe] text-[#1a73e8]' :
                'bg-[#f0f2f5] text-slate-600'
              }`}>
                {selectedTask.status === 'approved' && 'Принято'}
                {selectedTask.status === 'returned' && 'Возвращено'}
                {selectedTask.status === 'pending' && 'На проверке'}
                {selectedTask.status === 'in_progress' && 'В работе'}
                {selectedTask.status === 'not_started' && 'Не начато'}
              </span>
            </div>

            <p className="text-xs text-slate-500">
              Компетенция: {selectedTask.competency} · Плановое время: {selectedTask.planTime}
            </p>

            {/* Белая карточка: Описание, Практическое задание, Правила (как на Скриншоте 4) */}
            <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs space-y-5">
              <div>
                <h4 className="text-sm font-bold text-slate-900 mb-1.5">Описание</h4>
                <p className="text-xs text-slate-600 leading-relaxed">{selectedTask.description}</p>
              </div>

              <div>
                <h4 className="text-sm font-bold text-slate-900 mb-1.5">Практическое задание</h4>
                <p className="text-xs text-slate-600 leading-relaxed">{selectedTask.taskCondition}</p>
              </div>

              <div>
                <h4 className="text-sm font-bold text-slate-900 mb-1.5">Правила</h4>
                <p className="text-xs text-slate-600 leading-relaxed">{selectedTask.rules}</p>
              </div>
            </div>

            {/* Блок Ресурсы (как на Скриншоте 4) */}
            <div className="space-y-3">
              <h3 className="text-sm font-bold text-slate-900">Ресурсы</h3>
              <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs space-y-2.5">
                {selectedTask.materials?.map((m, i) => (
                  <div key={i}>
                    <a
                      href={m.url}
                      target="_blank"
                      rel="noreferrer"
                      className="text-xs font-semibold text-slate-800 hover:text-indigo-600 flex items-center space-x-1.5"
                    >
                      <span className="text-indigo-600">↗</span>
                      <span>{m.title}</span>
                    </a>
                  </div>
                ))}
              </div>
            </div>

            {/* История попыток и замечания эксперта */}
            {selectedTask.submissions && selectedTask.submissions.length > 0 && (
              <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs space-y-3">
                <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wider">История проверки экспертом:</h4>
                {selectedTask.submissions.map((sub, i) => (
                  <div key={i} className={`p-4 rounded-xl border text-xs ${
                    sub.verdict === 'approved' ? 'bg-emerald-50/70 border-emerald-200 text-emerald-900' :
                    sub.verdict === 'returned' ? 'bg-rose-50/70 border-rose-200 text-rose-900' :
                    'bg-amber-50/70 border-amber-200 text-amber-900'
                  }`}>
                    <div className="flex justify-between font-bold mb-1">
                      <span>Попытка № {sub.attemptNumber} ({sub.date})</span>
                      <span>
                        {sub.verdict === 'approved' && '✓ Зачтено'}
                        {sub.verdict === 'returned' && '✕ Возвращено на доработку'}
                        {sub.verdict === 'pending' && '⏳ Ожидает вердикта'}
                      </span>
                    </div>
                    <div><strong>Ссылка на PR:</strong> <a href={sub.link} target="_blank" rel="noreferrer" className="underline">{sub.link}</a></div>
                    {sub.comment && <div className="mt-1"><strong>Комментарий сотрудника:</strong> {sub.comment}</div>}
                    {sub.expertComment && (
                      <div className="mt-2 p-2 bg-white rounded-lg border border-slate-200 text-slate-800">
                        <strong>Замечания эксперта:</strong> {sub.expertComment}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}

            {/* Кнопка действия (как на Скриншоте 4) */}
            <div className="space-y-3">
              {selectedTask.status === 'not_started' && (
                <button
                  onClick={() => handleStartTask(selectedTask.id)}
                  className="px-6 py-2.5 bg-slate-900 hover:bg-slate-800 text-white font-semibold text-xs rounded-lg shadow-xs transition-colors"
                >
                  Начать задание
                </button>
              )}

              {(selectedTask.status === 'in_progress' || selectedTask.status === 'returned') && selectedTask.attemptsUsed < selectedTask.maxAttempts && (
                <button
                  onClick={() => setIsSubmitModalOpen(true)}
                  className="px-6 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold text-xs rounded-lg shadow-xs transition-colors"
                >
                  {selectedTask.attemptsUsed === 0 ? 'Сдать задание' : 'Пересдать задание (Попытка 2)'}
                </button>
              )}

              {selectedTask.status === 'pending' && (
                <div className="text-xs font-semibold px-4 py-2.5 rounded-lg bg-amber-50 text-amber-800 border border-amber-200 inline-block">
                  ⏳ Задание отправлено на проверку техническому эксперту
                </div>
              )}

              {selectedTask.status === 'approved' && (
                <div className="text-xs font-semibold px-4 py-2.5 rounded-lg bg-emerald-50 text-emerald-800 border border-emerald-200 inline-block">
                  ✓ Задание успешно принято экспертом
                </div>
              )}

              {/* Пунктирная подсказка в точности как на Скриншоте 4 */}
              <div className="p-4 rounded-xl border border-dashed border-slate-300 bg-white text-xs text-slate-500">
                После нажатия статус меняется на «В работе», фиксируется время начала, а кнопка становится «Сдать задание».
              </div>
            </div>
          </div>
        )}

        {/* ======================================================== */}
        {/* 4. МОИ ЗАДАНИЯ (СПИСОК)                                   */}
        {/* ======================================================== */}
        {currentRole === 'Сотрудник' && currentTab === 'tasks' && !selectedTask && (
          <div className="space-y-6">
            <div className="flex justify-between items-center">
              <div>
                <h2 className="text-2xl font-bold text-slate-900">Мои практические задания</h2>
                <p className="text-sm text-slate-500">Задания из программы обучения направления {currentUser.stack}</p>
              </div>

              <div className="flex bg-slate-200/60 p-1 rounded-lg text-xs font-medium">
                {[
                  { id: 'all', label: 'Все' },
                  { id: 'in_progress', label: 'В работе' },
                  { id: 'pending', label: 'На проверке' },
                  { id: 'returned', label: 'Возвращено' },
                  { id: 'approved', label: 'Принято' },
                ].map((tab) => (
                  <button
                    key={tab.id}
                    onClick={() => setTaskFilter(tab.id)}
                    className={`px-3 py-1.5 rounded-md transition-colors ${
                      taskFilter === tab.id ? 'bg-white text-slate-900 shadow-xs font-bold' : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    {tab.label}
                  </button>
                ))}
              </div>
            </div>

            <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-200 text-xs font-semibold text-slate-500 uppercase">
                    <th className="px-6 py-4">Номер</th>
                    <th className="px-6 py-4">Практическая работа</th>
                    <th className="px-6 py-4">Попытки</th>
                    <th className="px-6 py-4">Статус</th>
                    <th className="px-6 py-4 text-right">Действие</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-sm">
                  {filteredTasks.map((task) => (
                    <tr key={task.id} className="hover:bg-slate-50/70 transition-colors">
                      <td className="px-6 py-4 font-mono text-xs text-slate-500">{task.number}</td>
                      <td className="px-6 py-4 text-slate-900 font-semibold">{task.title}</td>
                      <td className="px-6 py-4">
                        <span className="text-xs px-2 py-0.5 rounded bg-slate-100 text-slate-600 font-medium">
                          {task.attemptsUsed} из {task.maxAttempts}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        {task.status === 'approved' && <span className="px-2.5 py-1 rounded-full text-xs font-semibold bg-[#e7f7ed] text-[#1e8346]">Принято</span>}
                        {task.status === 'pending' && <span className="px-2.5 py-1 rounded-full text-xs font-semibold bg-[#fef4e5] text-[#b47113]">На проверке</span>}
                        {task.status === 'returned' && <span className="px-2.5 py-1 rounded-full text-xs font-semibold bg-[#fdebee] text-[#cf2a45]">Возвращено</span>}
                        {task.status === 'in_progress' && <span className="px-2.5 py-1 rounded-full text-xs font-semibold bg-[#e8f0fe] text-[#1a73e8]">В работе</span>}
                        {task.status === 'not_started' && <span className="px-2.5 py-1 rounded-full text-xs font-medium bg-slate-100 text-slate-600">Не начато</span>}
                      </td>
                      <td className="px-6 py-4 text-right">
                        <button
                          onClick={() => setSelectedTask(task)}
                          className="px-3.5 py-1.5 text-xs font-medium bg-slate-100 hover:bg-slate-200 text-slate-800 rounded-lg transition-colors"
                        >
                          Открыть →
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* ======================================================== */}
        {/* 5. МАТРИЦА КОМПЕТЕНЦИЙ ИЗ БАЗЫ ДАННЫХ                    */}
        {/* ======================================================== */}
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

        {/* ======================================================== */}
        {/* 6. ЭКСПЕРТ: ОЧЕРЕДЬ РЕВЬЮ                                */}
        {/* ======================================================== */}
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
                          <td className="px-6 py-4 font-semibold text-slate-900">{latestSub?.authorFio || 'Иванов Иван'}</td>
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

        {/* ======================================================== */}
        {/* 7. АДМИНИСТРАТОР: РЕЕСТР И НАЗНАЧЕНИЕ СТЕКА              */}
        {/* ======================================================== */}
        {currentRole === 'Администратор' && currentTab === 'users' && (
          <div className="space-y-6">
            <div>
              <h2 className="text-2xl font-bold text-slate-900">Реестр пользователей системы</h2>
              <p className="text-sm text-slate-500">Управление учетными записями, назначение направления и блокировка (COMP-18)</p>
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

      {/* МОДАЛКА: НАЗНАЧЕНИЕ / СМЕНА СТЕКА (АДМИНИСТРАТОР) */}
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

      {/* МОДАЛКА: СДАЧА ДОМАШКИ (СОТРУДНИК) */}
      {isSubmitModalOpen && selectedTask && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 border border-slate-200 shadow-xl space-y-4">
            <div className="flex justify-between items-center pb-3 border-b border-slate-100">
              <h3 className="font-bold text-base text-slate-800">Сдача практической работы</h3>
              <button onClick={() => setIsSubmitModalOpen(false)} className="text-slate-400 hover:text-slate-600">✕</button>
            </div>
            <form onSubmit={handleSubmitTask} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 uppercase mb-1">Ссылка на решение (GitHub PR / Merge Request) *</label>
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

      {/* МОДАЛКА: РЕВЬЮ ЭКСПЕРТОМ (ПРИНЯТЬ / ОТКЛОНИТЬ) */}
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
                      ? 'Архитектура чистая, соблюдены SOLID и стандарты. Задание принято!'
                      : 'Переделайте обработку ошибок и изолируйте бизнес-логику.'
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