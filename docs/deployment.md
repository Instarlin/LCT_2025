# Развертывание системы

## Обзор

Система LCT_2025 развертывается с использованием Docker Compose, что обеспечивает простоту развертывания и консистентность окружения.

## Требования к системе

### Минимальные требования
- **ОС**: Linux (Ubuntu 20.04+), macOS, Windows с WSL2
- **Docker**: версия 20.10+
- **Docker Compose**: версия 2.20+
- **RAM**: 8 GB (рекомендуется 16 GB)
- **Диск**: 50 GB свободного места
- **CPU**: 4 ядра (рекомендуется 8 ядер)

### Рекомендуемые требования
- **RAM**: 32 GB для production
- **CPU**: 16 ядер для production
- **Диск**: SSD с 200+ GB свободного места
- **Сеть**: Стабильное подключение к интернету

## Быстрый старт

### 1. Клонирование репозитория
```bash
git clone <repository-url>
cd LCT_2025
```

### 2. Настройка переменных окружения
```bash
# Скопируйте и отредактируйте переменные
cp .env.example .env
nano .env
```

### 3. Запуск системы
```bash
# Сборка и запуск всех сервисов
docker compose up --build

# Или в фоновом режиме
docker compose up --build -d
```

### 4. Проверка статуса
```bash
# Проверка статуса контейнеров
docker compose ps

# Просмотр логов
docker compose logs -f
```

## Docker Compose конфигурация

### Сервисы

#### 1. Backend (backend)
```yaml
backend:
  build:
    context: ./backend
    dockerfile: Dockerfile
  container_name: backend-app
  working_dir: /app
  command: uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload --limit-max-requests 1099511628
  ports:
    - "8000:8000"
  environment:
    MINIO_ENDPOINT: minio:9000
    MINIO_ACCESS_KEY: minioadmin
    MINIO_SECRET_KEY: minioadmin
    DATABASE_URL: postgresql://postgres:password@postgres:5432/californiagold
    ML_SERVICE_URL: http://ml-service:8080
    ML_SERVICE_TOKEN: change_me_secure_token
    ML_DEFAULT_PROFILE: fast_debug
    ML_DECISION_THRESHOLD: "0.55"
  volumes:
    - ./backend:/app
  depends_on:
    postgres:
      condition: service_healthy
    minio:
      condition: service_started
    ml-service:
      condition: service_started
```

#### 2. Frontend (frontend)
```yaml
frontend:
  image: node:22-bullseye
  container_name: frontend-app
  working_dir: /app
  command: sh -c "npm install && npm run dev -- --host 0.0.0.0 --port 5173"
  ports:
    - "5173:5173"
  environment:
    NODE_ENV: development
    VITE_BACKEND_URL: http://backend:8000
  volumes:
    - ./frontend:/app
    - frontend_node_modules:/app/node_modules
  depends_on:
    - backend
```

#### 3. PostgreSQL (postgres)
```yaml
postgres:
  image: postgres:15
  container_name: postgres-db
  ports:
    - "5432:5432"
  volumes:
    - postgres_data:/var/lib/postgresql/data
  environment:
    POSTGRES_DB: californiagold
    POSTGRES_USER: postgres
    POSTGRES_PASSWORD: password
  healthcheck:
    test: ["CMD-SHELL", "pg_isready -U postgres -d californiagold"]
    interval: 5s
    timeout: 5s
    retries: 5
```

#### 4. MinIO (minio)
```yaml
minio:
  image: minio/minio:latest
  container_name: minio-storage
  ports:
    - "9000:9000"
    - "9001:9001"
  volumes:
    - minio_data:/data
  environment:
    MINIO_ROOT_USER: minioadmin
    MINIO_ROOT_PASSWORD: minioadmin
  command: server /data --console-address ":9001"
```

#### 5. ML Service (ml-service)
```yaml
ml-service:
  build:
    context: ./ml
    dockerfile: Dockerfile
  container_name: ml-service
  environment:
    MINIO_ENDPOINT: minio:9000
    MINIO_ACCESS_KEY: minioadmin
    MINIO_SECRET_KEY: minioadmin
    MINIO_BUCKET: californiagold
    BACKEND_URL: http://backend:8000
    ML_SERVICE_TOKEN: change_me_secure_token
    ML_DEFAULT_PROFILE: fast_debug
    ML_DECISION_THRESHOLD: "0.55"
  depends_on:
    minio:
      condition: service_started
```

### Тома данных
```yaml
volumes:
  frontend_node_modules:
  minio_data:
  postgres_data:
```

## Переменные окружения

### Backend переменные
```bash
# База данных
DATABASE_URL=postgresql://postgres:password@postgres:5432/californiagold

# MinIO хранилище
MINIO_ENDPOINT=minio:9000
MINIO_ACCESS_KEY=minioadmin
MINIO_SECRET_KEY=minioadmin

# ML сервис
ML_SERVICE_URL=http://ml-service:8080
ML_SERVICE_TOKEN=change_me_secure_token
ML_DEFAULT_PROFILE=fast_debug
ML_DECISION_THRESHOLD=0.55
```

### Frontend переменные
```bash
# Backend API
VITE_BACKEND_URL=http://backend:8000

# Режим разработки
NODE_ENV=development
```

### PostgreSQL переменные
```bash
POSTGRES_DB=californiagold
POSTGRES_USER=postgres
POSTGRES_PASSWORD=password
```

### MinIO переменные
```bash
MINIO_ROOT_USER=minioadmin
MINIO_ROOT_PASSWORD=minioadmin
```

## Управление жизненным циклом

### Запуск сервисов
```bash
# Запуск всех сервисов
docker compose up

# Запуск в фоновом режиме
docker compose up -d

# Запуск с пересборкой
docker compose up --build

# Запуск конкретного сервиса
docker compose up backend
```

### Остановка сервисов
```bash
# Остановка всех сервисов
docker compose down

# Остановка с удалением томов
docker compose down -v

# Остановка конкретного сервиса
docker compose stop backend
```

### Перезапуск сервисов
```bash
# Перезапуск всех сервисов
docker compose restart

# Перезапуск конкретного сервиса
docker compose restart backend
```

### Просмотр логов
```bash
# Логи всех сервисов
docker compose logs

# Логи конкретного сервиса
docker compose logs backend

# Логи в реальном времени
docker compose logs -f backend

# Последние N строк логов
docker compose logs --tail=100 backend
```

## Мониторинг и диагностика

### Проверка статуса
```bash
# Статус всех контейнеров
docker compose ps

# Детальная информация о контейнерах
docker compose ps --format "table {{.Name}}\t{{.Status}}\t{{.Ports}}"
```

### Проверка здоровья
```bash
# Health check backend
curl http://localhost:8000/health

# Health check frontend
curl http://localhost:5173

# Health check MinIO
curl http://localhost:9001
```

### Использование ресурсов
```bash
# Использование ресурсов контейнерами
docker stats

# Использование ресурсов конкретным контейнером
docker stats backend-app
```

## Backup и восстановление

### Backup базы данных
```bash
# Создание backup
docker compose exec postgres pg_dump -U postgres californiagold > backup.sql

# Восстановление из backup
docker compose exec -T postgres psql -U postgres californiagold < backup.sql
```

### Backup MinIO данных
```bash
# Создание backup MinIO
docker compose exec minio mc mirror /data /backup

# Восстановление MinIO
docker compose exec minio mc mirror /backup /data
```

### Backup томов Docker
```bash
# Создание backup тома
docker run --rm -v postgres_data:/data -v $(pwd):/backup alpine tar czf /backup/postgres_backup.tar.gz -C /data .

# Восстановление тома
docker run --rm -v postgres_data:/data -v $(pwd):/backup alpine tar xzf /backup/postgres_backup.tar.gz -C /data
```

## Production развертывание

### 1. Подготовка production окружения
```bash
# Создание production docker-compose файла
cp docker-compose.yaml docker-compose.prod.yaml

# Настройка production переменных
cp .env.example .env.prod
```

### 2. Настройка безопасности
```bash
# Генерация сильных паролей
openssl rand -base64 32

# Настройка SSL сертификатов
# (требует дополнительной настройки reverse proxy)
```

### 3. Оптимизация производительности
```yaml
# В docker-compose.prod.yaml
services:
  backend:
    deploy:
      resources:
        limits:
          memory: 2G
          cpus: '1.0'
        reservations:
          memory: 1G
          cpus: '0.5'
```

### 4. Мониторинг
```bash
# Установка мониторинга (опционально)
docker compose -f docker-compose.prod.yaml -f docker-compose.monitoring.yaml up -d
```

## Troubleshooting

### Частые проблемы

#### 1. Контейнеры не запускаются
```bash
# Проверка логов
docker compose logs

# Проверка конфигурации
docker compose config

# Пересборка образов
docker compose build --no-cache
```

#### 2. Проблемы с базой данных
```bash
# Проверка подключения к PostgreSQL
docker compose exec postgres psql -U postgres -d californiagold -c "SELECT 1;"

# Сброс базы данных
docker compose down -v
docker compose up -d postgres
```

#### 3. Проблемы с MinIO
```bash
# Проверка MinIO
docker compose exec minio mc admin info

# Создание bucket вручную
docker compose exec minio mc mb /data/uploads
```

#### 4. Проблемы с ML сервисом
```bash
# Проверка логов ML сервиса
docker compose logs ml-service

# Перезапуск ML сервиса
docker compose restart ml-service
```

### Очистка системы
```bash
# Удаление неиспользуемых образов
docker image prune -a

# Удаление неиспользуемых томов
docker volume prune

# Полная очистка системы
docker system prune -a --volumes
```

## Масштабирование

### Горизонтальное масштабирование
```yaml
# В docker-compose.prod.yaml
services:
  backend:
    deploy:
      replicas: 3
    ports:
      - "8000-8002:8000"
```

### Вертикальное масштабирование
```yaml
# Увеличение ресурсов
services:
  backend:
    deploy:
      resources:
        limits:
          memory: 4G
          cpus: '2.0'
```

## Обновление системы

### 1. Обновление кода
```bash
# Получение обновлений
git pull origin main

# Пересборка и перезапуск
docker compose down
docker compose up --build -d
```

### 2. Обновление образов
```bash
# Обновление всех образов
docker compose pull

# Перезапуск с новыми образами
docker compose up -d
```

### 3. Миграции базы данных
```bash
# Выполнение миграций
docker compose exec backend python migrate_*.py
```
