import React, { useState, useEffect } from 'react';
import {
  getFileDownloadUrlApi,
  getMeApi,
  getStacksApi,
  getSubmissionFilesApi,
  getUsersApi,
  loginApi,
  removeToken,
  updateUserProfileApi,
  uploadSubmissionFileApi,
} from './api';

const APP_INITIAL_TIME = Date.now();
const TASK_STATUS_PRIORITY = { returned: 0, needs_help: 1, in_progress: 2, not_started: 3, pending: 4, approved: 5 };
const createSubmissionId = () => Math.floor(Math.random() * 2_147_483_647) + 1;

// 3-уровневая структура программ обучения, соответствующая матрице компетенций:
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

// Реальные матрицы из БД с навыками и статусами
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
      { title: 'Официальный гайд Google: ViewModel Overview', url: 'https://developer.android.com/topic/libraries/architecture/viewmodel' },
      { title: 'Android Developers: StateFlow and SharedFlow', url: 'https://developer.android.com/kotlin/flow/stateflow-and-sharedflow' }
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
  const [isLoggingIn, setIsLoggingIn] = useState(false);
  const [authenticatedUser, setAuthenticatedUser] = useState(null);
  const [currentTimestamp, setCurrentTimestamp] = useState(APP_INITIAL_TIME);

  const [dbMatrixBlocks, setDbMatrixBlocks] = useState([]);
  const [dbPrograms, setDbPrograms] = useState([]);
  const [stackOptions, setStackOptions] = useState([]);
  const [usersError, setUsersError] = useState('');
  const [submissionFiles, setSubmissionFiles] = useState([]);
  const [submissionFilesError, setSubmissionFilesError] = useState('');

  useEffect(() => {
    async function fetchDatabaseContent() {
      try {
        const resBlocks = await fetch('/api/v1/matrices/blocks');
        if (resBlocks.ok) {
          const blocks = await resBlocks.json();
          setDbMatrixBlocks(blocks);
        }

        const resProg = await fetch('/api/v1/programs/');
        if (resProg.ok) {
          const progs = await resProg.json();
          setDbPrograms(progs);
        }
      } catch (e) {
        console.warn('API временно недоступен:', e);
      }
    }
    fetchDatabaseContent();
  }, []);

  // Централизованное состояние пользователей и задач
  const [users, setUsers] = useState([]);
  const [currentRole, setCurrentRole] = useState(null);
  const [currentTab, setCurrentTab] = useState('profile'); // 'profile' | 'program' | 'tasks' | 'matrix' | 'reviews' | 'users'
  const [tasks, setTasks] = useState(INITIAL_TASKS);

  // Состояние выбранного задания и экрана
  const [selectedTask, setSelectedTask] = useState(null);
  const [taskFilter, setTaskFilter] = useState('all');

  // Аккордеон тем программы обучения (раскрыты/свернуты)
  const [expandedThemes, setExpandedThemes] = useState({
    'fl-t1': true,
    'fl-t2': true,
    'an-t1': true,
    'an-t2': true,
  });

  const toggleTheme = (themeId) => {
    setExpandedThemes((prev) => ({
      ...prev,
      [themeId]: !prev[themeId],
    }));
  };

  // Модальные окна
  const [submitLinks, setSubmitLinks] = useState(['']);
  const [submitFiles, setSubmitFiles] = useState([]);
  const [submitComment, setSubmitComment] = useState('');
  const [submitError, setSubmitError] = useState('');
  const [isSubmittingTask, setIsSubmittingTask] = useState(false);
  const [isUploadingFiles, setIsUploadingFiles] = useState(false);
  const [activeSubmissionId, setActiveSubmissionId] = useState(null);
  const [reviewFileError, setReviewFileError] = useState('');
  const [taskReturnTab, setTaskReturnTab] = useState('program');

  const [isReviewModalOpen, setIsReviewModalOpen] = useState(false);
  const [reviewVerdict, setReviewVerdict] = useState('approved');
  const [reviewComment, setReviewComment] = useState('');

  const [isChangeStackModalOpen, setIsChangeStackModalOpen] = useState(false);
  const [targetUser, setTargetUser] = useState(null);
  const [selectedStackId, setSelectedStackId] = useState('');
  const [stackSaveError, setStackSaveError] = useState('');
  const [isSavingStack, setIsSavingStack] = useState(false);
  const isLoadingUsers = isAuth && ['Администратор', 'Эксперт'].includes(currentRole) && users.length === 0 && !usersError;

  const currentUser = authenticatedUser || { stack: null };

  const establishSession = (user) => {
    const allowedRoles = ['Сотрудник', 'Эксперт', 'Администратор'];
    if (!allowedRoles.includes(user.role)) {
      removeToken();
      throw new Error('Для учетной записи в базе данных не назначена допустимая роль.');
    }

    setAuthenticatedUser({
      ...user,
      stack_id: user.stack_id ?? null,
      startDate: user.start_date
        ? new Date(`${user.start_date}T00:00:00`).toLocaleDateString('ru-RU')
        : '—',
      stack: user.stack || null,
      grade: user.grade || '—',
    });
    setUsers([]);
    setUsersError('');
    setStackOptions([]);
    setSubmissionFiles([]);
    setSubmissionFilesError('');
    setCurrentRole(user.role);
    setIsAuth(true);
    setCurrentTab(user.role === 'Администратор' ? 'users' : user.role === 'Эксперт' ? 'reviews' : 'profile');
  };

  useEffect(() => {
    if (!isAuth || !['Администратор', 'Эксперт'].includes(currentRole)) return undefined;

    let isCurrent = true;

    Promise.all([
      getUsersApi(),
      currentRole === 'Администратор' ? getStacksApi() : Promise.resolve([]),
    ])
      .then(([apiUsers, apiStacks]) => {
        if (!isCurrent) return;
        setUsers(apiUsers.map((user) => ({
          ...user,
          startDate: user.start_date
            ? new Date(`${user.start_date}T00:00:00`).toLocaleDateString('ru-RU')
            : '—',
          stack: user.stack || null,
          grade: user.grade || '—',
        })));
        setStackOptions(apiStacks);
      })
      .catch((error) => {
        if (isCurrent) setUsersError(error.message);
      });

    return () => {
      isCurrent = false;
    };
  }, [isAuth, currentRole]);

  useEffect(() => {
    if (!isAuth || currentRole !== 'Эксперт') return undefined;

    let isCurrent = true;
    getSubmissionFilesApi()
      .then((files) => {
        if (isCurrent) setSubmissionFiles(files);
      })
      .catch((error) => {
        if (isCurrent) setSubmissionFilesError(error.message);
      });

    return () => {
      isCurrent = false;
    };
  }, [isAuth, currentRole]);

  useEffect(() => {
    if (!localStorage.getItem('token')) return;

    getMeApi()
      .then(establishSession)
      .catch((error) => {
        removeToken();
        setAuthError(error.message);
      });
  }, []);

  useEffect(() => {
    const timerId = window.setInterval(() => setCurrentTimestamp(Date.now()), 60000);
    return () => window.clearInterval(timerId);
  }, []);

  // Авторизация
  const handleLogin = async (e) => {
    e.preventDefault();
    setAuthError('');
    setIsLoggingIn(true);
    try {
      await loginApi(email.trim(), password);
      establishSession(await getMeApi());
      setPassword('');
    } catch (error) {
      setAuthError(error.message);
    } finally {
      setIsLoggingIn(false);
    }
  };

  const handleLogout = () => {
    removeToken();
    setIsAuth(false);
    setAuthenticatedUser(null);
    setCurrentRole(null);
    setSelectedTask(null);
    setSubmissionFiles([]);
    setSubmissionFilesError('');
  };

  // 1. АДМИНИСТРАТОР: Назначает / меняет стек сотруднику
  const handleSaveStack = async (e) => {
    e.preventDefault();
    if (!targetUser) return;
    const chosen = stackOptions.find((stack) => stack.id === Number(selectedStackId));
    if (!chosen) {
      setStackSaveError('Выберите направление из списка.');
      return;
    }

    setIsSavingStack(true);
    setStackSaveError('');
    try {
      const updatedUser = await updateUserProfileApi(targetUser.id, { stack_id: chosen.id });
      setUsers((previousUsers) => previousUsers.map((user) => (
        user.id === updatedUser.id
          ? {
              ...user,
              ...updatedUser,
              stack_id: updatedUser.stack_id,
              stack: updatedUser.stack || null,
              grade: updatedUser.grade || '—',
            }
          : user
      )));
      setIsChangeStackModalOpen(false);
      setTargetUser(null);
    } catch (error) {
      setStackSaveError(error.message);
    } finally {
      setIsSavingStack(false);
    }
  };

  // Мягкая блокировка
  const toggleUserActive = (userId) => {
    setUsers((prev) =>
      prev.map((u) => (u.id === userId ? { ...u, is_active: !u.is_active } : u))
    );
  };

  // Перевод задания в статус "В работе"
  const handleStartTask = (taskId) => {
    const startedAt = new Date().toISOString();
    setTasks((prev) =>
      prev.map((t) => (t.id === taskId ? { ...t, status: 'in_progress', startedAt, modifiedAt: startedAt } : t))
    );
    setSelectedTask((prev) => (prev ? { ...prev, status: 'in_progress', startedAt, modifiedAt: startedAt } : null));
  };

  // 2. СОТРУДНИК: Отправка домашки (сдача / пересдача)
  const handleSubmitTask = async (e) => {
    e.preventDefault();
    if (!selectedTask) return;
    const links = submitLinks.map((link) => link.trim()).filter(Boolean);
    if (!submitComment.trim() && links.length === 0 && submitFiles.length === 0) {
      setSubmitError('Добавьте текстовый ответ, ссылку или файл.');
      return;
    }

    setSubmitError('');
    setIsSubmittingTask(true);
    try {
      const submissionId = activeSubmissionId || createSubmissionId();
      const uploadedFiles = [];
      for (const file of submitFiles) {
        if (file.file_id) {
          uploadedFiles.push(file);
          continue;
        }

        const uploaded = await uploadSubmissionFileApi(file, submissionId);
        const attachedFile = {
          ...uploaded,
          name: uploaded.original_name,
          size: uploaded.size_bytes,
        };
        uploadedFiles.push(attachedFile);
        setSubmitFiles((files) => files.map((item) => item === file ? attachedFile : item));
      }

      const submittedAt = new Date().toISOString();
      const elapsedMinutes = selectedTask.startedAt
        ? Math.max(0, Math.round((Date.now() - new Date(selectedTask.startedAt).getTime()) / 60000))
        : 0;
      const actualMinutes = (selectedTask.actualMinutes || 0) + elapsedMinutes;
      const newSub = {
        id: submissionId,
        attemptNumber: selectedTask.attemptsUsed + 1,
        authorFio: currentUser.fio,
        date: 'Сегодня, ' + new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        links,
        files: uploadedFiles.map((file) => ({
          id: file.file_id,
          name: file.original_name || file.name,
          size: file.size_bytes ?? file.size,
        })),
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
              actualMinutes,
              modifiedAt: submittedAt,
              submissions: [newSub, ...(t.submissions || [])]
            };
            setSelectedTask(updated);
            return updated;
          }
          return t;
        })
      );

      setSubmitLinks(['']);
      setSubmitFiles([]);
      setSubmitComment('');
      setActiveSubmissionId(null);
      setCurrentTab('task_detail');
    } catch (error) {
      setSubmitError(error.message);
    } finally {
      setIsSubmittingTask(false);
    }
  };

  const handleSubmissionFilesSelected = async (event) => {
    const files = Array.from(event.target.files || []);
    event.target.value = '';
    if (files.length === 0) return;

    const submissionId = activeSubmissionId || createSubmissionId();
    if (!activeSubmissionId) setActiveSubmissionId(submissionId);
    setSubmitError('');
    setIsUploadingFiles(true);

    const uploadedFiles = [];
    const uploadErrors = [];
    for (const file of files) {
      try {
        const uploaded = await uploadSubmissionFileApi(file, submissionId);
        uploadedFiles.push({
          ...uploaded,
          name: uploaded.original_name,
          size: uploaded.size_bytes,
        });
      } catch (error) {
        uploadErrors.push(`${file.name}: ${error.message}`);
      }
    }

    if (uploadedFiles.length > 0) {
      setSubmitFiles((currentFiles) => [...currentFiles, ...uploadedFiles]);
    }
    if (uploadErrors.length > 0) {
      setSubmitError(uploadErrors.join(' '));
    }
    setIsUploadingFiles(false);
  };

  const openSubmissionFile = async (file) => {
    const fileWindow = window.open('about:blank', '_blank');
    if (!fileWindow) {
      setReviewFileError('Разрешите всплывающие окна, чтобы открыть файл.');
      setSubmissionFilesError('Разрешите всплывающие окна, чтобы открыть файл.');
      return;
    }

    try {
      const { download_url: downloadUrl } = await getFileDownloadUrlApi(file.id);
      fileWindow.location.href = downloadUrl;
      setReviewFileError('');
      setSubmissionFilesError('');
    } catch (error) {
      fileWindow.close();
      setReviewFileError(error.message);
      setSubmissionFilesError(error.message);
    }
  };

  // Проверка задания экспертом
  const handleReviewSubmit = (e) => {
    e.preventDefault();
    if (!selectedTask) return;

    const modifiedAt = new Date().toISOString();
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
            modifiedAt,
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

  // Динамический подсчет статистики по матрице
  const allCompetencies = employeeMatrix.flatMap((block) => block.competencies || []);
  const confirmedCount = allCompetencies.filter((c) => c.status === 'confirmed').length;
  const inProgressCount = allCompetencies.filter((c) => c.status === 'in_progress').length;
  const notStartedCount = allCompetencies.filter((c) => c.status === 'not_started').length;
  const completedTasksCount = employeeTasks.filter((t) => t.status === 'approved').length;
  const totalTasksCount = employeeTasks.length;

  // Фильтрация в табе "Мои задания"
  const filteredTasks = employeeTasks.filter((t) => {
    if (taskFilter === 'all') return true;
    if (taskFilter === 'in_progress') return t.status === 'in_progress';
    if (taskFilter === 'pending') return t.status === 'pending';
    if (taskFilter === 'approved') return t.status === 'approved';
    if (taskFilter === 'returned') return t.status === 'returned';
    if (taskFilter === 'needs_help') return t.status === 'needs_help';
    return true;
  }).sort((a, b) => TASK_STATUS_PRIORITY[a.status] - TASK_STATUS_PRIORITY[b.status]);
  const taskStatusCounts = {
    todo: employeeTasks.filter((task) => ['not_started', 'in_progress'].includes(task.status)).length,
    returned: employeeTasks.filter((task) => task.status === 'returned').length,
    needsHelp: employeeTasks.filter((task) => task.status === 'needs_help').length,
    pending: employeeTasks.filter((task) => task.status === 'pending').length,
    approved: employeeTasks.filter((task) => task.status === 'approved').length,
  };

  const openTaskFromSection = (taskId) => {
    const found = tasks.find((t) => t.id === taskId);
    if (found) {
      setTaskReturnTab('program');
      setSelectedTask(found);
      setCurrentTab('task_detail');
    }
  };

  const formatTaskTime = (minutes) => {
    if (minutes == null) return '—';
    const hours = Math.floor(minutes / 60);
    const remainingMinutes = minutes % 60;
    return remainingMinutes ? `${hours} ч ${remainingMinutes} мин` : `${hours} ч`;
  };

  const formatModifiedDate = (date, fallback) => {
    if (!date) return fallback || '—';
    const parsedDate = new Date(date);
    if (Number.isNaN(parsedDate.getTime())) return fallback || '—';
    return parsedDate.toLocaleDateString('ru-RU', { day: '2-digit', month: '2-digit' });
  };

  const getTaskActualMinutes = (task) => {
    if (task.actualMinutes != null) return task.actualMinutes;
    if (task.status === 'in_progress' && task.startedAt) {
      return Math.max(0, Math.round((currentTimestamp - new Date(task.startedAt).getTime()) / 60000));
    }
    return null;
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
              disabled={isLoggingIn}
              className="w-full py-2.5 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-60 text-white font-medium rounded-lg text-sm shadow-md shadow-indigo-100 transition-colors"
            >
              {isLoggingIn ? 'Выполняется вход…' : 'Войти в систему'}
            </button>
          </form>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#f5f6f8] flex flex-col font-sans text-slate-800">
      {/* ======================================================== */}
      {/* ВЕРХНЯЯ ШАПКА                                            */}
      {/* ======================================================== */}
      <header className="bg-white border-b border-slate-200 sticky top-0 z-30">
        <div className="max-w-6xl mx-auto px-6 h-16 flex items-center justify-between">
          <div className="flex items-center space-x-8">
            <div className="flex items-center space-x-2">
              <span className="font-bold text-slate-900 tracking-tight text-base">Компетенции</span>
            </div>

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

            {currentRole === 'Эксперт' && (
              <nav className="flex space-x-6 text-sm">
                <button
                  onClick={() => setCurrentTab('profile')}
                  className={`font-medium transition-colors ${
                    currentTab === 'profile' ? 'text-slate-900 font-bold border-b-2 border-slate-900 py-5' : 'text-slate-500 hover:text-slate-900 py-5'
                  }`}
                >
                  Кабинет
                </button>
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

            {currentRole === 'Администратор' && (
              <nav className="flex space-x-6 text-sm">
                <button
                  onClick={() => setCurrentTab('profile')}
                  className={`font-medium transition-colors ${
                    currentTab === 'profile' ? 'text-slate-900 font-bold border-b-2 border-slate-900 py-5' : 'text-slate-500 hover:text-slate-900 py-5'
                  }`}
                >
                  Кабинет
                </button>
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

          <div className="flex items-center space-x-5 text-sm">
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
        {/* 1. ЛИЧНЫЙ КАБИНЕТ СОТРУДНИКА (ПО МАКЕТУ 02 И 02б)        */}
        {/* ======================================================== */}
        {currentTab === 'profile' && (
          <div className="space-y-6">
            <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-xs">
              <div className="flex items-center space-x-4">
                <div className="w-16 h-16 bg-slate-200 rounded-full flex-shrink-0 flex items-center justify-center text-slate-500 font-bold text-lg">
                  {currentUser.fio ? currentUser.fio[0] : 'И'}
                </div>
                <div>
                  <h2 className="text-lg font-bold text-slate-900">{currentUser.fio}</h2>
                  <span className="inline-flex mt-1 px-3 py-1 rounded-full bg-blue-50 text-blue-800 text-xs font-semibold">
                    {currentUser.role}
                  </span>
                </div>
              </div>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-5 mt-5 pt-5 border-t border-slate-200">
                {currentRole === 'Сотрудник' && (
                  <div>
                    <div className="text-xs text-slate-400">Направление</div>
                    <div className="text-sm font-medium text-slate-900 mt-1">{currentUser.stack || 'Не назначено'}</div>
                  </div>
                )}
                <div>
                  <div className="text-xs text-slate-400">Грейд</div>
                  <div className="text-sm font-medium text-slate-900 mt-1">{currentUser.grade}</div>
                </div>
                <div>
                  <div className="text-xs text-slate-400">Должность</div>
                  <div className="text-sm font-medium text-slate-900 mt-1">{currentUser.position || '—'}</div>
                </div>
                <div>
                  <div className="text-xs text-slate-400">Дата начала работы</div>
                  <div className="text-sm font-medium text-slate-900 mt-1">{currentUser.startDate}</div>
                </div>
              </div>
            </div>

            {/* Блок «Моя программа» */}
            {currentRole === 'Сотрудник' && (
              <div className="space-y-3">
              <h3 className="text-sm font-bold text-slate-900">Моя программа</h3>
              {!currentUser.stack ? (
                <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs space-y-2">
                  <h4 className="text-sm font-bold text-slate-900">Программа обучения пока не назначена</h4>
                  <p className="text-xs text-slate-500 leading-relaxed">
                    Эксперт или администратор назначит программу. Пока можно посмотреть матрицу компетенций.
                  </p>
                </div>
              ) : (
                <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs space-y-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <h4 className="text-sm font-bold text-slate-900">{currentProgram?.title}</h4>
                      <p className="text-xs text-slate-500 mt-0.5">
                        Пройдено {completedTasksCount} из {totalTasksCount} практических заданий
                      </p>
                    </div>
                    <div className="flex space-x-2">
                      <button
                        onClick={() => setCurrentTab('program')}
                        className="px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white text-xs font-semibold rounded-lg transition-colors"
                      >
                        Открыть программу
                      </button>
                      <button
                        onClick={() => setCurrentTab('tasks')}
                        className="px-4 py-2 border border-slate-300 hover:bg-slate-50 text-slate-700 text-xs font-semibold rounded-lg transition-colors"
                      >
                        Мои задания
                      </button>
                    </div>
                  </div>

                  {/* Прогресс-бар по макету 02 */}
                  <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden">
                    <div
                      className="bg-slate-900 h-full rounded-full transition-all duration-300"
                      style={{ width: `${totalTasksCount > 0 ? (completedTasksCount / totalTasksCount) * 100 : 0}%` }}
                    ></div>
                  </div>
                </div>
              )}
              </div>
            )}

            {/* Блок «Матрица компетенций» (в точности как на Скриншоте 2) */}
            {currentRole === 'Сотрудник' && (
              <div className="space-y-3">
                <h3 className="text-sm font-bold text-slate-900">Матрица компетенций</h3>
                <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs space-y-2">
                  <div className="grid grid-cols-3 gap-4 text-slate-900 text-xs">
                    <div><strong className="block text-xl">{confirmedCount}</strong><span className="text-slate-500">Подтверждено</span></div>
                    <div><strong className="block text-xl">{inProgressCount}</strong><span className="text-slate-500">В процессе</span></div>
                    <div><strong className="block text-xl">{notStartedCount}</strong><span className="text-slate-500">Не оценено</span></div>
                  </div>
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
                    Открыть матрицу
                  </button>
                </div>
              </div>
            )}
          </div>
        )}

        {/* ======================================================== */}
        {/* 2. ПРОГРАММА ОБУЧЕНИЯ (АККОРДЕОН В ТОЧНОСТИ ПО МАКЕТУ 03) */}
        {/* ======================================================== */}
        {currentRole === 'Сотрудник' && currentTab === 'program' && currentProgram && (
          <div className="space-y-6">
            <button
              onClick={() => setCurrentTab('profile')}
              className="text-xs font-semibold text-slate-500 hover:text-slate-900 flex items-center space-x-1"
            >
              <span>← В кабинет</span>
            </button>

            <div className="flex items-center justify-between">
              <h2 className="text-2xl font-bold text-slate-900">{currentProgram.title}</h2>
              <span className="text-xs font-semibold px-3 py-1 bg-slate-100 text-slate-600 rounded-full border border-slate-200">
                Стек: {currentUser.stack}
              </span>
            </div>

            <div className="space-y-4">
              {currentProgram.themes.map((theme) => {
                const isExpanded = expandedThemes[theme.id] !== false;
                return (
                  <div key={theme.id} className="space-y-2">
                    {/* Кликабельная серая плашка Темы */}
                    <button
                      type="button"
                      onClick={() => toggleTheme(theme.id)}
                      className="w-full bg-[#e9ecf1] hover:bg-[#dfe3ea] px-5 py-3.5 rounded-xl text-xs font-bold text-slate-800 tracking-wide flex items-center justify-between transition-colors text-left"
                    >
                      <div className="flex items-center space-x-2">
                        <span className="text-slate-600">{isExpanded ? '▾' : '▸'}</span>
                        <span>{theme.title}</span>
                      </div>
                      <span className="text-[11px] font-medium text-slate-500">
                        {theme.subthemes.length} подтемы
                      </span>
                    </button>

                    {/* Развернутый список подтем */}
                    {isExpanded && (
                      <div className="space-y-2 pl-2 transition-all">
                        {theme.subthemes.map((subtheme) => (
                          <div key={subtheme.id} className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-xs">
                            <div className="px-6 py-4 flex items-center justify-between bg-white">
                              <div className="flex items-center space-x-4">
                                <span className="text-xs text-slate-400 font-semibold w-6">{subtheme.number}</span>
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

                            {/* Уровень 3: Разделы с материалами и карточками заданий */}
                            <div className="border-t border-slate-100 bg-slate-50/70 p-4 pl-12 space-y-2.5">
                              <div className="text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-1">
                                Задания и материалы:
                              </div>
                              {subtheme.sections.map((sec) => (
                                <div key={sec.id} className="bg-white p-3.5 rounded-lg border border-slate-200 flex items-center justify-between hover:border-slate-300 transition-colors">
                                  <div>
                                    <div className="text-xs font-bold text-slate-900">
                                      {sec.number} {sec.title}
                                    </div>
                                    <div className="text-[11px] text-slate-500 mt-0.5 flex items-center space-x-2">
                                      <span>Компетенция: <strong>{sec.competency}</strong></span>
                                      <span>•</span>
                                      <span>Материалов: {sec.materials.length}</span>
                                    </div>
                                  </div>
                                  <button
                                    onClick={() => openTaskFromSection(sec.taskId)}
                                    className="px-3.5 py-1.5 bg-slate-900 hover:bg-slate-800 text-white text-xs font-semibold rounded-md shadow-xs transition-colors whitespace-nowrap"
                                  >
                                    Открыть задание →
                                  </button>
                                </div>
                              ))}
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* ======================================================== */}
        {/* 3. КАРТОЧКА ЗАДАНИЯ (ПО МАКЕТУ 05 И 05б)                 */}
        {/* ======================================================== */}
        {currentRole === 'Сотрудник' && currentTab === 'task_detail' && selectedTask && (
          <div className="space-y-6">
            <button
              onClick={() => {
                setSelectedTask(null);
                setCurrentTab(taskReturnTab);
              }}
              className="text-xs font-semibold text-slate-500 hover:text-slate-900 flex items-center space-x-1"
            >
              <span>{taskReturnTab === 'program' ? '← К программе' : '← К заданиям'}</span>
            </button>

            <div className="flex items-center justify-between">
              <h2 className="text-2xl font-bold text-slate-900">
                {selectedTask.number} {selectedTask.title}
              </h2>
              <span className={`px-3 py-1 rounded-full text-xs font-semibold ${
                selectedTask.status === 'approved' ? 'bg-[#e7f7ed] text-[#1e8346]' :
                selectedTask.status === 'returned' ? 'bg-[#fdebee] text-[#cf2a45]' :
                selectedTask.status === 'pending' ? 'bg-[#fef4e5] text-[#b47113]' :
                selectedTask.status === 'needs_help' ? 'bg-[#fdebee] text-[#cf2a45]' :
                selectedTask.status === 'in_progress' ? 'bg-[#e8f0fe] text-[#1a73e8]' :
                'bg-[#f0f2f5] text-slate-600'
              }`}>
                {selectedTask.status === 'approved' && 'Принято'}
                {selectedTask.status === 'returned' && 'Возвращено'}
                {selectedTask.status === 'pending' && 'На проверке'}
                {selectedTask.status === 'needs_help' && 'Требуется помощь'}
                {selectedTask.status === 'in_progress' && 'В работе'}
                {selectedTask.status === 'not_started' && 'Не начато'}
              </span>
            </div>

            <p className="text-xs text-slate-500">
              Компетенция: {selectedTask.competency} · Плановое время: {selectedTask.planTime}
            </p>

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

            {/* Блок Ресурсы (материалы для изучения) */}
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
                    {(sub.links?.length ? sub.links : sub.link ? [sub.link] : []).map((link, index) => (
                      <div key={link}><strong>{index === 0 ? 'Ссылка:' : 'Ссылка 2:'}</strong> <a href={link} target="_blank" rel="noreferrer" className="underline">{link}</a></div>
                    ))}
                    {sub.files?.map((file) => (
                      <div key={file.name}><strong>Файл:</strong> {file.name}</div>
                    ))}
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

            {/* Кнопки действий */}
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
                  onClick={() => {
                    setSubmitError('');
                    setActiveSubmissionId(createSubmissionId());
                    setSubmitLinks(['']);
                    setSubmitFiles([]);
                    setSubmitComment('');
                    if (selectedTask.status === 'returned') {
                      const startedAt = new Date().toISOString();
                      const resumedTask = { ...selectedTask, status: 'in_progress', startedAt, modifiedAt: startedAt };
                      setSelectedTask(resumedTask);
                      setTasks((prev) => prev.map((task) => task.id === selectedTask.id ? resumedTask : task));
                    }
                    setCurrentTab('task_submission');
                  }}
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

              <div className="p-4 rounded-xl border border-dashed border-slate-300 bg-white text-xs text-slate-500">
                После нажатия статус меняется на «В работе», фиксируется время начала, а кнопка становится «Сдать задание».
              </div>
            </div>
          </div>
        )}

        {currentRole === 'Сотрудник' && currentTab === 'task_submission' && selectedTask && (
          <div className="max-w-4xl mx-auto space-y-6">
            <button
              onClick={() => setCurrentTab('task_detail')}
              className="text-xs font-semibold text-slate-500 hover:text-slate-900"
            >
              ← К заданию
            </button>
            <div className="flex items-center justify-between">
              <h2 className="text-2xl font-bold text-slate-900">{selectedTask.number} {selectedTask.title}</h2>
              <span className="px-3 py-1 rounded-full bg-blue-50 text-blue-800 text-xs font-semibold">В работе</span>
            </div>
            <form onSubmit={handleSubmitTask} className="bg-white rounded-xl border border-slate-200 p-6 space-y-5">
              <div>
                <label htmlFor="submission-comment" className="block text-sm font-medium text-slate-900 mb-2">Ответ текстом</label>
                <textarea
                  id="submission-comment"
                  rows="3"
                  placeholder="Опишите, что сделано..."
                  value={submitComment}
                  onChange={(e) => setSubmitComment(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm outline-none focus:border-indigo-600"
                />
              </div>
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <label className="block text-sm font-medium text-slate-900">Ссылки на результат</label>
                  <button type="button" onClick={() => setSubmitLinks((links) => [...links, ''])} className="text-sm font-medium text-indigo-700">
                    + Добавить ссылку
                  </button>
                </div>
                {submitLinks.map((link, index) => (
                  <div key={index} className="flex gap-2">
                    <input
                      type="url"
                      aria-label={`Ссылка на результат ${index + 1}`}
                      placeholder="https://..."
                      value={link}
                      onChange={(e) => setSubmitLinks((links) => links.map((value, i) => i === index ? e.target.value : value))}
                      className="min-w-0 flex-1 px-3 py-2 border border-slate-300 rounded-lg text-sm outline-none focus:border-indigo-600"
                    />
                    {submitLinks.length > 1 && (
                      <button type="button" onClick={() => setSubmitLinks((links) => links.filter((_, i) => i !== index))} className="px-3 text-slate-500">
                        Удалить
                      </button>
                    )}
                  </div>
                ))}
              </div>
              <div>
                <label htmlFor="submission-files" className="block text-sm font-medium text-slate-900 mb-2">Файлы</label>
                <input
                  id="submission-files"
                  type="file"
                  multiple
                  disabled={isUploadingFiles}
                  onChange={handleSubmissionFilesSelected}
                  className="sr-only"
                />
                <label
                  htmlFor="submission-files"
                  className={`inline-flex cursor-pointer items-center rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-700 shadow-sm transition-colors hover:border-indigo-400 hover:bg-indigo-50 hover:text-indigo-700 ${isUploadingFiles ? 'pointer-events-none opacity-60' : ''}`}
                >
                  {isUploadingFiles ? 'Загрузка файлов…' : '＋ Прикрепить файл'}
                </label>
                <p className="mt-2 text-xs text-slate-500">Можно прикрепить несколько файлов, до 50 МБ каждый.</p>
                {submitFiles.length > 0 && (
                  <ul className="mt-3 space-y-2">
                    {submitFiles.map((file, index) => (
                      <li key={`${file.name}-${index}`} className="flex justify-between gap-3 text-sm text-slate-700">
                          <span className="truncate">
                            {file.original_name || file.name}{' '}
                            <span className="text-slate-400">({((file.size_bytes ?? file.size) / 1024 / 1024).toFixed(2)} МБ)</span>
                            {file.file_id && <span className="ml-2 text-emerald-700">Загружен в хранилище</span>}
                          </span>
                          <button type="button" onClick={() => setSubmitFiles((files) => files.filter((_, i) => i !== index))} className="text-slate-500">
                            Удалить
                          </button>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
              <div className="text-sm font-semibold text-rose-700">
                Осталось сдач: {Math.max(0, selectedTask.maxAttempts - selectedTask.attemptsUsed)} из {selectedTask.maxAttempts}
              </div>
              {submitError && <p role="alert" className="text-sm text-rose-700">{submitError}</p>}
              <div className="flex gap-3">
                <button type="submit" disabled={isSubmittingTask || isUploadingFiles} className="px-5 py-2.5 bg-slate-900 hover:bg-slate-800 text-white text-sm font-semibold rounded-lg disabled:cursor-wait disabled:opacity-60">
                  {isSubmittingTask ? 'Отправляем…' : isUploadingFiles ? 'Загрузка файлов…' : 'Отправить на проверку'}
                </button>
                <button type="button" onClick={() => setCurrentTab('task_detail')} className="px-5 py-2.5 border border-slate-300 text-slate-800 text-sm font-medium rounded-lg">
                  Отмена
                </button>
              </div>
              <p className="text-xs text-slate-500">Пустая форма не отправляется: добавьте текст, ссылку или файл.</p>
            </form>
          </div>
        )}

        {/* ======================================================== */}
        {/* 4. МОИ ЗАДАНИЯ (СПИСОК)                                   */}
        {/* ======================================================== */}
        {currentRole === 'Сотрудник' && currentTab === 'tasks' && !selectedTask && (
          <div className="space-y-6">
            <div className="flex justify-between items-center">
              <div>
                <h2 className="text-2xl font-bold text-slate-900">Мои задания</h2>
                <p className="text-sm text-slate-500">Задания из программы обучения направления {currentUser.stack}</p>
              </div>

              <div className="flex bg-slate-200/60 p-1 rounded-lg text-xs font-medium">
                {[
                  { id: 'all', label: 'Все' },
                  { id: 'in_progress', label: 'В работе' },
                  { id: 'pending', label: 'На проверке' },
                  { id: 'returned', label: 'Возвращено' },
                  { id: 'needs_help', label: 'Требуется помощь' },
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

            <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
              {[
                { label: 'Нужно сделать', count: taskStatusCounts.todo },
                { label: 'Возвращено', count: taskStatusCounts.returned },
                { label: 'Требуется помощь', count: taskStatusCounts.needsHelp },
                { label: 'На проверке', count: taskStatusCounts.pending },
                { label: 'Принято', count: taskStatusCounts.approved },
              ].map((item) => (
                <div key={item.label} className="bg-white rounded-xl border border-slate-200 px-4 py-3">
                  <strong className="block text-xl text-slate-900">{item.count}</strong>
                  <span className="text-xs text-slate-500">{item.label}</span>
                </div>
              ))}
            </div>
            <p className="text-xs text-slate-500">Сначала задания, где нужно действие</p>

            <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-x-auto">
              <table className="min-w-[1050px] w-full text-left border-collapse">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-200 text-xs font-semibold text-slate-500 uppercase">
                    <th className="px-6 py-4">Номер</th>
                    <th className="px-6 py-4">Задание</th>
                    <th className="px-6 py-4">Тема</th>
                    <th className="px-6 py-4">Статус</th>
                    <th className="px-6 py-4">Попытки</th>
                    <th className="px-6 py-4">Факт / план</th>
                    <th className="px-6 py-4">Изменено</th>
                    <th className="px-6 py-4"></th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-sm">
                  {filteredTasks.map((task) => (
                    <tr key={task.id} className="hover:bg-slate-50/70 transition-colors">
                      <td className="px-6 py-4 font-mono text-xs text-slate-500">{task.number}</td>
                      <td className="px-6 py-4 text-slate-900 font-semibold">{task.title}</td>
                      <td className="px-6 py-4 text-slate-700">{task.competency}</td>
                      <td className="px-6 py-4">
                        {task.status === 'approved' && <span className="px-2.5 py-1 rounded-full text-xs font-semibold bg-[#e7f7ed] text-[#1e8346]">Принято</span>}
                        {task.status === 'pending' && <span className="px-2.5 py-1 rounded-full text-xs font-semibold bg-[#fef4e5] text-[#b47113]">На проверке</span>}
                        {task.status === 'returned' && <span className="px-2.5 py-1 rounded-full text-xs font-semibold bg-[#fdebee] text-[#cf2a45]">Возвращено</span>}
                        {task.status === 'needs_help' && <span className="px-2.5 py-1 rounded-full text-xs font-semibold bg-[#fdebee] text-[#cf2a45]">Требуется помощь</span>}
                        {task.status === 'in_progress' && <span className="px-2.5 py-1 rounded-full text-xs font-semibold bg-[#e8f0fe] text-[#1a73e8]">В работе</span>}
                        {task.status === 'not_started' && <span className="px-2.5 py-1 rounded-full text-xs font-medium bg-slate-100 text-slate-600">Не начато</span>}
                      </td>
                      <td className="px-6 py-4">
                        <span className="text-xs px-2 py-0.5 rounded bg-slate-100 text-slate-600 font-medium">
                          {task.attemptsUsed} из {task.maxAttempts}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-xs">
                        {formatTaskTime(getTaskActualMinutes(task))} / {task.planTime || '—'}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-xs">{formatModifiedDate(task.modifiedAt, task.submissions?.[0]?.date)}</td>
                      <td className="px-6 py-4 text-right">
                        <button
                          onClick={() => {
                            setTaskReturnTab('tasks');
                            setSelectedTask(task);
                            setCurrentTab('task_detail');
                          }}
                          className="px-3.5 py-1.5 text-xs font-medium bg-slate-100 hover:bg-slate-200 text-slate-800 rounded-lg transition-colors"
                        >
                          Открыть
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {!isLoadingUsers && !usersError && users.length === 0 && (
                <p className="p-6 text-center text-sm text-slate-500">Пользователи не найдены.</p>
              )}
            </div>
          </div>
        )}

        {/* ======================================================== */}
        {/* 5. МАТРИЦА КОМПЕТЕНЦИЙ (ПОЛНОЦЕННОЕ ДЕРЕВО НАВЫКОВ)       */}
        {/* ======================================================== */}
        {currentRole === 'Сотрудник' && currentTab === 'matrix' && (
          <div className="space-y-6">
            <div className="flex justify-between items-center">
              <div>
                <h2 className="text-2xl font-bold text-slate-900">
                  Матрица компетенций: {currentUser.stack}
                </h2>
                <p className="text-sm text-slate-500">
                  Карта профессионального развития и подтвержденные навыки для грейда {currentUser.grade}
                </p>
              </div>
              <div className="flex items-center space-x-2">
                <span className="text-xs font-semibold px-3 py-1 bg-emerald-50 text-emerald-700 rounded-full border border-emerald-200">
                  Подтверждено: {confirmedCount}
                </span>
                <span className="text-xs font-semibold px-3 py-1 bg-amber-50 text-amber-700 rounded-full border border-amber-200">
                  В процессе: {inProgressCount}
                </span>
              </div>
            </div>

            <div className="space-y-4">
              {employeeMatrix.map((block) => (
                <div key={block.id} className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-xs">
                  <div className="bg-slate-50 px-6 py-4 border-b border-slate-200 flex items-center justify-between">
                    <div className="flex items-center space-x-3">
                      <div className="w-2.5 h-2.5 rounded-full bg-indigo-600"></div>
                      <h3 className="text-sm font-bold text-slate-900">{block.name}</h3>
                    </div>
                    <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">
                      {block.competencies.length} навыка
                    </span>
                  </div>

                  <div className="divide-y divide-slate-100">
                    {block.competencies.map((comp) => (
                      <div key={comp.id} className="px-6 py-3.5 flex items-center justify-between hover:bg-slate-50/60 transition-colors">
                        <div className="pr-4">
                          <p className="text-xs font-medium text-slate-800 leading-relaxed">{comp.name}</p>
                          <span className="inline-block mt-1 text-[10px] font-bold px-2 py-0.5 bg-slate-100 text-slate-600 rounded">
                            Грейд: {comp.grade}
                          </span>
                        </div>
                        <div className="flex-shrink-0">
                          {comp.status === 'confirmed' && (
                            <span className="px-3 py-1 rounded-full text-[11px] font-semibold bg-[#e7f7ed] text-[#1e8346] flex items-center space-x-1">
                              <span>✓</span>
                              <span>Подтверждено</span>
                            </span>
                          )}
                          {comp.status === 'in_progress' && (
                            <span className="px-3 py-1 rounded-full text-[11px] font-semibold bg-[#fef4e5] text-[#b47113]">
                              В процессе
                            </span>
                          )}
                          {comp.status === 'not_started' && (
                            <span className="px-3 py-1 rounded-full text-[11px] font-medium bg-[#f0f2f5] text-slate-500">
                              Не оценено
                            </span>
                          )}
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
              <p className="text-sm text-slate-500">Работы сотрудников, ожидающие проверки</p>
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
                      <th className="px-6 py-4 text-right"></th>
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
                            <a href={latestSub?.links?.[0] || latestSub?.link} target="_blank" rel="noreferrer" className="text-xs font-semibold text-indigo-600 hover:text-indigo-800">
                              {latestSub?.links?.[0] || latestSub?.link} ↗
                            </a>
                          </td>
                          <td className="px-6 py-4 text-right">
                            <button
                              onClick={() => { setReviewFileError(''); setSelectedTask(task); setIsReviewModalOpen(true); }}
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
                  На проверке пока нет заданий.
                </div>
              )}
            </div>

            <section className="space-y-3">
              <div>
                <h3 className="text-lg font-bold text-slate-900">Файлы из сдач</h3>
                <p className="text-sm text-slate-500">Загруженные сотрудниками файлы, доступные из MinIO</p>
              </div>
              {submissionFilesError && (
                <p role="alert" className="rounded-lg border border-rose-200 bg-rose-50 p-3 text-sm text-rose-700">
                  {submissionFilesError}
                </p>
              )}
              <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-xs">
                {submissionFiles.length > 0 ? (
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="bg-slate-50 border-b border-slate-200 text-xs font-semibold text-slate-500 uppercase">
                        <th className="px-6 py-4">Сотрудник</th>
                        <th className="px-6 py-4">Файл</th>
                        <th className="px-6 py-4">Дата загрузки</th>
                        <th className="px-6 py-4 text-right">Действие</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 text-sm">
                      {submissionFiles.map((file) => (
                        <tr key={file.id}>
                          <td className="px-6 py-4 font-medium text-slate-900">{file.uploaded_by}</td>
                          <td className="px-6 py-4 text-slate-700">
                            {file.original_name}
                            {file.size_bytes != null && (
                              <span className="ml-2 text-xs text-slate-400">
                                ({(file.size_bytes / 1024 / 1024).toFixed(2)} МБ)
                              </span>
                            )}
                          </td>
                          <td className="px-6 py-4 text-slate-500">
                            {new Date(file.uploaded_at).toLocaleString('ru-RU')}
                          </td>
                          <td className="px-6 py-4 text-right">
                            <button
                              type="button"
                              onClick={() => openSubmissionFile(file)}
                              className="font-semibold text-indigo-600 hover:text-indigo-800"
                            >
                              Открыть
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                ) : (
                  <div className="p-6 text-center text-sm text-slate-500">Загруженных файлов пока нет.</div>
                )}
              </div>
            </section>
          </div>
        )}

        {/* ======================================================== */}
        {/* 7. АДМИНИСТРАТОР: РЕЕСТР И НАЗНАЧЕНИЕ СТЕКА              */}
        {/* ======================================================== */}
        {currentRole === 'Администратор' && currentTab === 'users' && (
          <div className="space-y-6">
            <div>
              <h2 className="text-2xl font-bold text-slate-900">Реестр пользователей системы</h2>
              <p className="text-sm text-slate-500">Управление учетными записями, направлениями и доступом</p>
            </div>

            {usersError && <p role="alert" className="rounded-lg border border-rose-200 bg-rose-50 p-3 text-sm text-rose-700">{usersError}</p>}
            {isLoadingUsers && <p className="text-sm text-slate-500">Загружаем пользователей…</p>}
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
                      <td className="px-6 py-4">
                        {u.role !== 'Сотрудник' ? (
                          <span className="text-slate-300">—</span>
                        ) : u.stack ? (
                          <span className="font-bold text-indigo-600">{u.stack}</span>
                        ) : (
                          <span className="inline-flex items-center gap-1.5 whitespace-nowrap rounded-full border border-amber-200 bg-amber-50 px-2.5 py-1 text-xs font-semibold text-amber-800">
                            <span aria-hidden="true" className="h-1.5 w-1.5 rounded-full bg-amber-500" />
                            Не назначен
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
                                setSelectedStackId(u.stack_id || stackOptions[0]?.id || '');
                                setStackSaveError('');
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
              {stackSaveError && <p role="alert" className="rounded-lg border border-rose-200 bg-rose-50 p-3 text-sm text-rose-700">{stackSaveError}</p>}
              <div>
                <label className="block text-xs font-semibold text-slate-700 uppercase mb-1">
                  Выберите технологическое направление:
                </label>
                <select
                  value={selectedStackId}
                  onChange={(e) => setSelectedStackId(Number(e.target.value))}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm outline-none bg-white font-medium"
                >
                  {stackOptions.map((s) => (
                    <option key={s.id} value={s.id}>{s.name}</option>
                  ))}
                </select>
                {stackOptions.length === 0 && <p className="mt-2 text-sm text-rose-700">В базе данных нет доступных направлений.</p>}
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
                  disabled={isSavingStack || stackOptions.length === 0}
                  className="px-4 py-2 bg-indigo-600 text-white text-xs font-semibold rounded-lg disabled:opacity-60"
                >
                  {isSavingStack ? 'Сохраняем…' : 'Сохранить направление'}
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
              {(selectedTask.submissions?.[0]?.links?.length
                ? selectedTask.submissions[0].links
                : selectedTask.submissions?.[0]?.link
                  ? [selectedTask.submissions[0].link]
                  : []
              ).map((link, index) => (
                <div key={link}>
                  <span className="font-semibold">Ссылка {index + 1}:</span>{' '}
                  <a href={link} target="_blank" rel="noreferrer" className="text-indigo-600 underline font-mono">
                    {link}
                  </a>
                </div>
              ))}
              {selectedTask.submissions?.[0]?.files?.map((file) => (
                <div key={file.id || file.name} className="flex items-center justify-between gap-3">
                  <span><span className="font-semibold">Файл:</span> {file.name}</span>
                  {file.id && (
                    <button
                      type="button"
                      onClick={() => openSubmissionFile(file)}
                      className="shrink-0 text-indigo-600 underline"
                    >
                      Открыть
                    </button>
                  )}
                </div>
              ))}
              {reviewFileError && <p role="alert" className="text-rose-700">{reviewFileError}</p>}
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