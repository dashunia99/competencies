// frontend/src/matrixData.js

export const ANDROID_FULL_MATRIX = [
  {
    id: 1,
    name: '1. Язык программирования Kotlin и основы ООП',
    subsections: [
      {
        id: 11,
        name: '1.1 Базовый синтаксис и Null Safety',
        competencies: [
          { id: 101, name: 'Синтаксис, переменные (val/var), базовые типы данных', grade: 'Junior', status: 'confirmed' },
          { id: 102, name: 'Null Safety: nullable-типы, операторы ?., ?:, !!', grade: 'Junior', status: 'confirmed' },
          { id: 103, name: 'Функции, параметры по умолчанию, extension functions', grade: 'Junior', status: 'confirmed' }
        ]
      },
      {
        id: 12,
        name: '1.2 Объектно-ориентированное программирование',
        competencies: [
          { id: 104, name: 'Классы, интерфейсы, абстрактные классы и наследование', grade: 'Junior', status: 'confirmed' },
          { id: 105, name: 'Data classes, Sealed classes и Enum', grade: 'Junior', status: 'confirmed' },
          { id: 106, name: 'Принципы SOLID в проектировании классов', grade: 'Middle', status: 'in_progress' }
        ]
      },
      {
        id: 13,
        name: '1.3 Асинхронность и корутины',
        competencies: [
          { id: 107, name: 'Основы Kotlin Coroutines: launch, async, suspend functions', grade: 'Junior', status: 'in_progress' },
          { id: 108, name: 'Диспетчеры (Dispatchers.IO, Main) и CoroutineScope', grade: 'Junior', status: 'not_started' },
          { id: 109, name: 'Реактивные потоки StateFlow и SharedFlow', grade: 'Middle', status: 'not_started' }
        ]
      }
    ]
  },
  {
    id: 2,
    name: '2. Архитектура Android-приложений и UI',
    subsections: [
      {
        id: 21,
        name: '2.1 Компоненты приложения и жизненный цикл',
        competencies: [
          { id: 201, name: 'Жизненный цикл Activity и Fragment, BackStack', grade: 'Junior', status: 'confirmed' },
          { id: 202, name: 'Сохранение состояния при смене конфигурации (SavedStateHandle)', grade: 'Junior', status: 'confirmed' },
          { id: 203, name: 'Single Activity Architecture и Navigation Component', grade: 'Junior', status: 'in_progress' }
        ]
      },
      {
        id: 22,
        name: '2.2 Архитектурные паттерны',
        competencies: [
          { id: 204, name: 'Архитектурный паттерн MVVM и StateFlow', grade: 'Junior', status: 'in_progress' },
          { id: 205, name: 'Внедрение зависимостей (Hilt / Koin)', grade: 'Middle', status: 'not_started' },
          { id: 206, name: 'Clean Architecture: Domain, Data и Presentation слои', grade: 'Middle', status: 'not_started' }
        ]
      }
    ]
  },
  {
    id: 3,
    name: '3. Работа с сетью и локальное хранилище данных',
    subsections: [
      {
        id: 31,
        name: '3.1 Сетевой стек и API',
        competencies: [
          { id: 301, name: 'Клиент Retrofit, интерфейсы API, OkHttp и Interceptors', grade: 'Junior', status: 'not_started' },
          { id: 302, name: 'Сериализация JSON (KotlinX Serialization / Moshi)', grade: 'Junior', status: 'not_started' },
          { id: 303, name: 'Обработка сетевых ошибок (401, 500)', grade: 'Junior', status: 'not_started' }
        ]
      },
      {
        id: 32,
        name: '3.2 Локальная база данных',
        competencies: [
          { id: 304, name: 'База данных Room: Entity, DAO, TypeConverters', grade: 'Junior', status: 'not_started' },
          { id: 305, name: 'Миграции базы данных Room (автоматические и ручные)', grade: 'Middle', status: 'not_started' },
          { id: 306, name: 'DataStore Preferences для сохранения настроек приложения', grade: 'Junior', status: 'not_started' }
        ]
      }
    ]
  }
];

export const ANDROID_LEARNING_PROGRAM = [
  {
    order: 1,
    theme: 'Основы Kotlin и стандартная библиотека',
    competencyName: 'Синтаксис, переменные (val/var), базовые типы данных',
    status: 'completed',
    materialsUrl: 'https://kotlinlang.org/docs/basic-syntax.html',
    taskTitle: 'Практика: алгоритмические задачи на Kotlin'
  },
  {
    order: 2,
    theme: 'Объектно-ориентированное программирование',
    competencyName: 'Классы, интерфейсы, data/sealed классы',
    status: 'completed',
    materialsUrl: 'https://kotlinlang.org/docs/inheritance.html',
    taskTitle: 'Практика: моделирование предметной области'
  },
  {
    order: 3,
    theme: 'Архитектура Android-приложений',
    competencyName: 'Архитектурный паттерн MVVM и StateFlow',
    status: 'in_progress',
    materialsUrl: 'https://developer.android.com/topic/libraries/architecture/viewmodel',
    taskTitle: 'Практика: реализация экрана заметок на MVVM'
  },
  {
    order: 4,
    theme: 'Сетевой стек и API',
    competencyName: 'Клиент Retrofit, OkHttp и перехватчики (Interceptors)',
    status: 'not_started',
    materialsUrl: 'https://square.github.io/retrofit/',
    taskTitle: 'Практика: интеграция Retrofit с обработкой 401'
  },
  {
    order: 5,
    theme: 'Локальная база данных',
    competencyName: 'База данных Room: Entity, DAO и миграции',
    status: 'not_started',
    materialsUrl: 'https://developer.android.com/training/data-storage/room',
    taskTitle: 'Практика: создание локального кэша и миграция БД'
  }
];