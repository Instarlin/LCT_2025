# API Документация

## Обзор

California Gold API предоставляет REST API для управления пользователями, файлами и заданиями анализа медицинских изображений. API построен на FastAPI и включает автоматическую генерацию OpenAPI документации.

## Базовый URL

- **Development**: `http://localhost:8000`
- **Production**: `https://your-domain.com`

## Аутентификация

### JWT токены
API использует JWT токены для аутентификации. Токен должен передаваться в заголовке `Authorization`:

```
Authorization: Bearer <your-jwt-token>
```

### Получение токена
```http
POST /auth/login
Content-Type: application/json

{
  "username": "your_username",
  "password": "your_password"
}
```

**Ответ:**
```json
{
  "access_token": "eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzI1NiJ9...",
  "token_type": "bearer"
}
```

## Эндпоинты

### 🔐 Аутентификация

#### POST /auth/register
Регистрация нового пользователя.

**Тело запроса:**
```json
{
  "username": "string",
  "email": "string (optional)",
  "password": "string",
  "full_name": "string (optional)",
  "bio": "string (optional)",
  "avatar_url": "string (optional)"
}
```

**Валидация:**
- `username`: обязательное, уникальное
- `email`: опциональное, уникальное если указано
- `password`: обязательное, 6-24 символа

**Ответ:**
```json
{
  "id": 1,
  "username": "user123",
  "email": "user@example.com",
  "full_name": "John Doe",
  "bio": "Medical researcher",
  "avatar_url": "https://example.com/avatar.jpg",
  "created_at": "2024-01-01T00:00:00Z",
  "updated_at": null
}
```

#### POST /auth/login
Вход в систему.

**Тело запроса:**
```json
{
  "username": "string",
  "password": "string"
}
```

**Ответ:**
```json
{
  "access_token": "eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzI1NiJ9...",
  "token_type": "bearer"
}
```

### 👥 Пользователи

#### GET /users
Получение списка пользователей.

**Параметры запроса:**
- `skip` (int, optional): количество записей для пропуска (по умолчанию: 0)
- `limit` (int, optional): максимальное количество записей (по умолчанию: 100)

**Ответ:**
```json
[
  {
    "id": 1,
    "username": "user1",
    "email": "user1@example.com",
    "full_name": "User One",
    "bio": "Bio text",
    "avatar_url": "https://example.com/avatar1.jpg",
    "created_at": "2024-01-01T00:00:00Z",
    "updated_at": null
  }
]
```

#### GET /users/{user_id}
Получение пользователя по ID.

**Параметры пути:**
- `user_id` (int): ID пользователя

**Ответ:**
```json
{
  "id": 1,
  "username": "user1",
  "email": "user1@example.com",
  "full_name": "User One",
  "bio": "Bio text",
  "avatar_url": "https://example.com/avatar1.jpg",
  "created_at": "2024-01-01T00:00:00Z",
  "updated_at": null
}
```

#### PUT /users/{user_id}
Обновление пользователя.

**Параметры пути:**
- `user_id` (int): ID пользователя

**Тело запроса:**
```json
{
  "username": "string (optional)"
}
```

#### DELETE /users/{user_id}
Удаление пользователя.

**Параметры пути:**
- `user_id` (int): ID пользователя

**Ответ:**
```json
{
  "message": "Пользователь успешно удален"
}
```

#### GET /users/username/{username}
Поиск пользователя по username.

**Параметры пути:**
- `username` (string): имя пользователя

### 📁 Файлы

#### POST /upload
Загрузка файла в MinIO.

**Параметры запроса:**
- `file` (file): файл для загрузки
- `bucket_name` (string, optional): имя bucket (по умолчанию: "uploads")

**Ответ:**
```json
{
  "message": "Файл успешно загружен",
  "filename": "example.dcm",
  "bucket": "uploads",
  "size": 1024000
}
```

#### GET /files
Получение списка файлов.

**Параметры запроса:**
- `bucket_name` (string, optional): имя bucket (по умолчанию: "uploads")
- `prefix` (string, optional): фильтр по префиксу

**Ответ:**
```json
{
  "bucket": "uploads",
  "files": [
    {
      "name": "file1.dcm",
      "size": 1024000,
      "last_modified": "2024-01-01T00:00:00Z"
    }
  ],
  "count": 1
}
```

#### GET /download/{filename}
Скачивание файла.

**Параметры пути:**
- `filename` (string): имя файла

**Параметры запроса:**
- `bucket_name` (string, optional): имя bucket (по умолчанию: "uploads")

**Ответ:** Файл как поток данных

#### DELETE /files/{filename}
Удаление файла.

**Параметры пути:**
- `filename` (string): имя файла

**Параметры запроса:**
- `bucket_name` (string, optional): имя bucket (по умолчанию: "uploads")

**Ответ:**
```json
{
  "message": "Файл 'example.dcm' успешно удален"
}
```

#### GET /files/{filename}/url
Получение presigned URL для файла.

**Параметры пути:**
- `filename` (string): имя файла

**Параметры запроса:**
- `bucket_name` (string, optional): имя bucket (по умолчанию: "uploads")
- `expires` (int, optional): время жизни ссылки в секундах (по умолчанию: 3600)

**Ответ:**
```json
{
  "filename": "example.dcm",
  "url": "https://minio.example.com/uploads/example.dcm?X-Amz-Algorithm=...",
  "expires_in_seconds": 3600
}
```

### 📋 Задания

#### POST /jobs
Создание нового задания.

**Требует аутентификации:** Да

**Параметры запроса:**
- `title` (string, optional): название задания
- `description` (string, optional): описание задания
- `file` (file, optional): файл для анализа

**Ответ:**
```json
{
  "id": "550e8400-e29b-41d4-a716-446655440000",
  "title": "Medical Analysis",
  "description": "CT scan analysis",
  "status": "queued",
  "file_name": "scan.dcm",
  "file_size": 1024000,
  "owner_id": 1,
  "created_at": "2024-01-01T00:00:00Z",
  "updated_at": null,
  "results_payload": null,
  "results_parsed_at": null
}
```

#### GET /jobs
Получение заданий пользователя.

**Требует аутентификации:** Да

**Параметры запроса:**
- `limit` (int, optional): максимальное количество записей (по умолчанию: 100)
- `skip` (int, optional): количество записей для пропуска (по умолчанию: 0)

**Ответ:**
```json
[
  {
    "id": "550e8400-e29b-41d4-a716-446655440000",
    "title": "Medical Analysis",
    "description": "CT scan analysis",
    "status": "completed",
    "file_name": "scan.dcm",
    "file_size": 1024000,
    "owner_id": 1,
    "created_at": "2024-01-01T00:00:00Z",
    "updated_at": "2024-01-01T01:00:00Z",
    "results_payload": {
      "summary": {
        "total_volume": 1500.5,
        "lesions_count": 3
      },
      "findings": [
        {
          "type": "lesion",
          "volume": 500.2,
          "confidence": 0.95
        }
      ]
    },
    "results_parsed_at": "2024-01-01T01:00:00Z"
  }
]
```

#### GET /jobs/{job_id}
Получение задания по UUID.

**Параметры пути:**
- `job_id` (string): UUID задания

**Ответ:**
```json
{
  "id": "550e8400-e29b-41d4-a716-446655440000",
  "title": "Medical Analysis",
  "description": "CT scan analysis",
  "status": "completed",
  "file_name": "scan.dcm",
  "file_size": 1024000,
  "owner_id": 1,
  "created_at": "2024-01-01T00:00:00Z",
  "updated_at": "2024-01-01T01:00:00Z",
  "results_payload": {
    "summary": {
      "total_volume": 1500.5,
      "lesions_count": 3
    },
    "findings": [
      {
        "type": "lesion",
        "volume": 500.2,
        "confidence": 0.95
      }
    ]
  },
  "results_parsed_at": "2024-01-01T01:00:00Z"
}
```

#### PUT /jobs/{job_id}
Обновление задания.

**Параметры пути:**
- `job_id` (int): ID задания

**Тело запроса:**
```json
{
  "title": "string (optional)",
  "description": "string (optional)",
  "status": "string (optional)"
}
```

#### DELETE /jobs/{job_id}
Удаление задания.

**Параметры пути:**
- `job_id` (int): ID задания

**Ответ:**
```json
{
  "message": "Задание успешно удалено"
}
```

#### GET /jobs/{job_id}/file
Скачивание файла задания.

**Параметры пути:**
- `job_id` (int): ID задания

**Ответ:** Файл как поток данных

#### GET /jobs/{job_id}/zip-contents
Получение содержимого ZIP архива.

**Параметры пути:**
- `job_id` (int): ID задания

**Ответ:**
```json
{
  "job_id": 1,
  "zip_filename": "archive.zip",
  "total_files": 5,
  "files": [
    {
      "name": "file1.dcm",
      "size": 1024000,
      "compressed_size": 512000
    }
  ]
}
```

#### GET /jobs/{job_id}/zip-info
Получение информации о ZIP архиве.

**Параметры пути:**
- `job_id` (int): ID задания

**Ответ:**
```json
{
  "job_id": 1,
  "zip_filename": "archive.zip",
  "file_size": 2048000,
  "zip_info": {
    "total_files": 5,
    "compressed_size": 1024000,
    "compression_ratio": 0.5
  }
}
```

#### GET /jobs/{job_id}/results
Получение результатов анализа.

**Параметры пути:**
- `job_id` (string): UUID задания

**Ответ:**
```json
{
  "job_id": "550e8400-e29b-41d4-a716-446655440000",
  "parsed_at": "2024-01-01T01:00:00Z",
  "results": {
    "summary": {
      "total_volume": 1500.5,
      "lesions_count": 3,
      "confidence": 0.92
    },
    "findings": [
      {
        "type": "lesion",
        "volume": 500.2,
        "confidence": 0.95,
        "location": {
          "x": 100,
          "y": 200,
          "z": 150
        }
      }
    ],
    "metrics": [
      {
        "name": "dice_score",
        "value": 0.89
      }
    ]
  },
  "source": "cached"
}
```

### 🔧 Система

#### GET /health
Проверка здоровья системы.

**Ответ:**
```json
{
  "status": "healthy",
  "minio_endpoint": "localhost:9000",
  "message": "FastAPI и MinIO работают корректно"
}
```

## WebSocket API

### WS /ws/jobs/{job_id}
Real-time обновления заданий.

**Параметры пути:**
- `job_id` (string): UUID задания

**Сообщения от сервера:**
```json
{
  "type": "job.update",
  "job": {
    "id": "550e8400-e29b-41d4-a716-446655440000",
    "status": "processing",
    "progress": 50,
    "updated_at": "2024-01-01T00:30:00Z"
  }
}
```

**Сообщения от клиента:**
- Любое текстовое сообщение (ping/pong)

## Коды ошибок

### HTTP статус коды
- `200` - Успешный запрос
- `201` - Ресурс создан
- `400` - Некорректные данные запроса
- `401` - Неавторизованный доступ
- `404` - Ресурс не найден
- `422` - Ошибка валидации
- `500` - Внутренняя ошибка сервера

### Формат ошибок
```json
{
  "detail": "Описание ошибки"
}
```

**Примеры ошибок:**
```json
{
  "detail": "Email уже зарегистрирован"
}
```

```json
{
  "detail": "Неверное имя пользователя или пароль"
}
```

```json
{
  "detail": "Задание не найдено"
}
```

## Rate Limiting

### Ограничения
- **Загрузка файлов**: 10 запросов в минуту
- **API запросы**: 100 запросов в минуту
- **WebSocket соединения**: 5 на пользователя

### Заголовки ответа
```
X-RateLimit-Limit: 100
X-RateLimit-Remaining: 95
X-RateLimit-Reset: 1640995200
```

## CORS

### Настройки CORS
- **Разрешенные источники**: `*` (все)
- **Разрешенные методы**: `GET`, `POST`, `PUT`, `DELETE`, `OPTIONS`
- **Разрешенные заголовки**: `*` (все)
- **Поддержка credentials**: Да

## Примеры использования

### 1. Полный цикл анализа
```bash
# 1. Регистрация пользователя
curl -X POST "http://localhost:8000/auth/register" \
  -H "Content-Type: application/json" \
  -d '{"username": "doctor", "password": "password123", "email": "doctor@example.com"}'

# 2. Вход в систему
curl -X POST "http://localhost:8000/auth/login" \
  -H "Content-Type: application/json" \
  -d '{"username": "doctor", "password": "password123"}'

# 3. Создание задания
curl -X POST "http://localhost:8000/jobs" \
  -H "Authorization: Bearer <token>" \
  -F "file=@scan.dcm" \
  -F "title=CT Scan Analysis"

# 4. Получение результатов
curl -X GET "http://localhost:8000/jobs/{job_id}/results" \
  -H "Authorization: Bearer <token>"
```

### 2. WebSocket подключение
```javascript
const ws = new WebSocket('ws://localhost:8000/ws/jobs/550e8400-e29b-41d4-a716-446655440000');

ws.onmessage = function(event) {
  const data = JSON.parse(event.data);
  if (data.type === 'job.update') {
    console.log('Job status:', data.job.status);
  }
};
```

## OpenAPI документация

### Swagger UI
- **URL**: `http://localhost:8000/docs`
- **Описание**: Интерактивная документация API

### ReDoc
- **URL**: `http://localhost:8000/redoc`
- **Описание**: Альтернативная документация API

### OpenAPI Schema
- **URL**: `http://localhost:8000/openapi.json`
- **Описание**: JSON схема API
