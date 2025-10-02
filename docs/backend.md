# Backend компоненты

## Обзор

Backend системы LCT_2025 построен на FastAPI и обеспечивает REST API, управление данными, интеграцию с ML сервисом и файловым хранилищем.

## Структура проекта

```
backend/
├── app/
│   ├── __init__.py
│   ├── main.py              # Основное приложение FastAPI
│   ├── auth.py              # Аутентификация и авторизация
│   ├── crud.py              # CRUD операции для пользователей
│   ├── job_crud.py          # CRUD операции для заданий
│   ├── database.py          # Конфигурация базы данных
│   ├── db_wait.py           # Ожидание готовности PostgreSQL
│   ├── models.py            # SQLAlchemy модели
│   ├── schemas.py           # Pydantic схемы
│   ├── minio_client.py      # Клиент MinIO
│   ├── minio_utils.py       # Утилиты для работы с MinIO
│   ├── websocket_manager.py # Управление WebSocket соединениями
│   ├── zip_utils.py         # Утилиты для работы с ZIP архивами
│   ├── ml/                  # ML интеграция
│   │   ├── __init__.py
│   │   └── adapter.py       # Адаптер для ML сервиса
│   └── parsers/             # Парсеры результатов
├── Dockerfile
├── requirements.txt
└── migrate_*.py             # Скрипты миграций
```

## Основные компоненты

### 1. main.py - Основное приложение

**Функции:**
- Инициализация FastAPI приложения
- Настройка CORS middleware
- Регистрация всех эндпоинтов
- Управление WebSocket соединениями
- Интеграция с ML сервисом

**Ключевые особенности:**
- Автоматическая генерация OpenAPI документации
- Подробные описания эндпоинтов на русском языке
- Группировка эндпоинтов по функциональности
- Обработка ошибок и валидация данных

### 2. models.py - Модели данных

**Таблица Users:**
```python
class User(Base):
    __tablename__ = "users"
    
    id = Column(Integer, primary_key=True, index=True)
    username = Column(String(50), unique=True, index=True, nullable=False)
    hashed_password = Column(String(255), nullable=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())
    jobs = relationship("Job", back_populates="owner")
```

**Таблица Jobs:**
```python
class Job(Base):
    __tablename__ = "jobs"
    
    id = Column(Integer, primary_key=True, index=True)
    uuid = Column(UUID(as_uuid=True), default=uuid.uuid4, unique=True, index=True)
    title = Column(String(200), nullable=True)
    description = Column(Text, nullable=True)
    status = Column(String(50), default="pending")
    file_path = Column(String(500), nullable=True)
    file_name = Column(String(255), nullable=True)
    file_size = Column(Integer, nullable=True)
    file_content_type = Column(String(100), nullable=True)
    file_type = Column(String(20), default="single")
    zip_contents = Column(Text, nullable=True)
    results_payload = Column(Text, nullable=True)
    results_parsed_at = Column(DateTime(timezone=True), nullable=True)
    owner_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())
    completed_at = Column(DateTime(timezone=True), nullable=True)
    owner = relationship("User", back_populates="jobs")
```

### 3. schemas.py - Pydantic схемы

**Основные схемы:**
- `UserBase`, `UserCreate`, `UserUpdate`, `UserResponse` - для пользователей
- `JobBase`, `JobCreate`, `JobUpdate`, `JobResponse` - для заданий
- `Token`, `TokenData`, `UserLogin` - для аутентификации
- `JobCompletionPayload` - для результатов ML обработки

**Особенности:**
- Валидация данных на уровне схем
- Автоматическая сериализация/десериализация
- Поддержка JSON для сложных полей
- Валидация паролей (6-24 символа)

### 4. auth.py - Аутентификация

**Функции:**
- Хеширование паролей с PBKDF2-SHA256
- Создание и проверка JWT токенов
- Аутентификация пользователей
- Получение текущего пользователя из токена

**Безопасность:**
- Соль для хеширования паролей
- Время жизни токенов (настраивается)
- Проверка подписи токенов

### 5. database.py - Конфигурация БД

**Настройки:**
- Подключение к PostgreSQL через SQLAlchemy
- Создание сессий базы данных
- Dependency injection для FastAPI

**Переменные окружения:**
- `DATABASE_URL` - строка подключения к PostgreSQL

### 6. minio_client.py - Клиент MinIO

**Функции:**
- Загрузка файлов в MinIO
- Скачивание файлов из MinIO
- Удаление файлов
- Получение списка файлов
- Генерация presigned URL

**Особенности:**
- Автоматическое создание bucket'ов
- Обработка ошибок S3
- Логирование операций

### 7. websocket_manager.py - WebSocket управление

**Функции:**
- Управление WebSocket соединениями
- Группировка соединений по job_id
- Broadcast обновлений заданий
- Обработка отключений

### 8. ML интеграция (ml/)

**adapter.py:**
- Адаптер для взаимодействия с ML сервисом
- Отправка заданий на обработку
- Получение результатов
- Обработка ошибок ML сервиса

## API Эндпоинты

### Аутентификация
- `POST /auth/register` - Регистрация пользователя
- `POST /auth/login` - Вход в систему

### Пользователи
- `GET /users` - Список пользователей
- `GET /users/{user_id}` - Получение пользователя по ID
- `PUT /users/{user_id}` - Обновление пользователя
- `DELETE /users/{user_id}` - Удаление пользователя
- `GET /users/username/{username}` - Поиск по username

### Файлы
- `POST /upload` - Загрузка файла
- `GET /files` - Список файлов
- `GET /download/{filename}` - Скачивание файла
- `DELETE /files/{filename}` - Удаление файла
- `GET /files/{filename}/url` - Presigned URL

### Задания
- `POST /jobs` - Создание задания
- `GET /jobs` - Список заданий пользователя
- `GET /jobs/{job_id}` - Получение задания
- `PUT /jobs/{job_id}` - Обновление задания
- `DELETE /jobs/{job_id}` - Удаление задания
- `GET /jobs/{job_id}/file` - Скачивание файла задания
- `GET /jobs/{job_id}/zip-contents` - Содержимое ZIP архива
- `GET /jobs/{job_id}/zip-info` - Информация о ZIP архиве
- `GET /jobs/{job_id}/results` - Результаты анализа

### WebSocket
- `WS /ws/jobs/{job_id}` - Real-time обновления заданий

### Система
- `GET /health` - Проверка здоровья системы

## Обработка файлов

### Поддерживаемые типы
- Обычные файлы (любого типа)
- ZIP архивы с автоматическим анализом содержимого

### Процесс загрузки
1. Валидация файла
2. Определение типа (обычный/ZIP)
3. Загрузка в MinIO
4. Сохранение метаданных в PostgreSQL
5. Создание задания для ML обработки

### ZIP архивы
- Автоматическое определение ZIP файлов
- Валидация содержимого
- Извлечение списка файлов
- Сохранение метаданных архива

## Интеграция с ML сервисом

### Отправка заданий
1. Создание задания в статусе "queued"
2. Отправка в ML сервис через HTTP
3. Обновление статуса на "processing"
4. Ожидание результатов

### Получение результатов
1. ML сервис отправляет результаты на `/internal/jobs/{job_id}/completion`
2. Валидация токена ML сервиса
3. Обновление статуса задания
4. Парсинг результатов (если применимо)
5. Broadcast обновления через WebSocket

## Обработка ошибок

### Типы ошибок
- HTTP 400 - Некорректные данные
- HTTP 401 - Неавторизованный доступ
- HTTP 404 - Ресурс не найден
- HTTP 500 - Внутренняя ошибка сервера

### Логирование
- Структурированные логи
- Логирование всех операций с файлами
- Логирование ошибок ML сервиса
- WebSocket соединения

## Конфигурация

### Переменные окружения
- `DATABASE_URL` - Подключение к PostgreSQL
- `MINIO_ENDPOINT` - Адрес MinIO сервера
- `MINIO_ACCESS_KEY` - Ключ доступа MinIO
- `MINIO_SECRET_KEY` - Секретный ключ MinIO
- `ML_SERVICE_URL` - URL ML сервиса
- `ML_SERVICE_TOKEN` - Токен для ML сервиса
- `ML_DEFAULT_PROFILE` - Профиль ML по умолчанию
- `ML_DECISION_THRESHOLD` - Порог принятия решений

### Зависимости
- fastapi - Web framework
- uvicorn - ASGI сервер
- sqlalchemy - ORM
- psycopg2-binary - PostgreSQL драйвер
- minio - MinIO клиент
- passlib - Аутентификация
- python-jose - JWT токены
- httpx - HTTP клиент для ML сервиса
