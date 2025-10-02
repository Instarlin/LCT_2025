# LCT_2025

## Состав проекта
- `backend` — FastAPI API, отвечает за бизнес-логику, взаимодействие с PostgreSQL и MinIO.
- `frontend` — интерфейс на React + Vite, обращается к backend через REST API.
- `ml` — заготовка сервиса машинного обучения, разворачивается отдельным контейнером рядом с backend.
- `docker-compose.yaml` — инфраструктурная обвязка для локального запуска всех сервисов.

## Cтарт через Docker Compose
1. Установите Docker Desktop или Docker Engine с Docker Compose версии 2.20+.
2. При необходимости отредактируйте переменные окружения в `docker-compose.yaml` (пароли, ML токен и т.д.).
3. Выполните сборку и запуск стека:
   ```bash
   docker compose up --build
   ```
!!! Развертка решения локально может занимать много времени !!!

4. После успешного старта будут доступны:
   - Backend API и Swagger UI: http://localhost:8000/docs
   - Frontend: http://localhost:5173
   - MinIO (S3-совместимое хранилище): http://localhost:9001 (логин/пароль `minioadmin` / `minioadmin`)
   - PostgreSQL: `postgres://postgres:password@localhost:5432/californiagold`

### Управление жизненным циклом контейнеров
- Остановка сервисов:
  ```bash
  docker compose down
  ```
- Полная очистка данных (включая тома):
  ```bash
  docker compose down -v
  ```
- Просмотр логов конкретного сервиса, например backend:
  ```bash
  docker compose logs -f backend
  ```

## Ручной запуск для разработки
> Этот вариант подойдёт, если нужно запускать сервисы раздельно или отлаживать их без Docker.

### Backend (FastAPI)
1. Установите Python 3.11.
2. Создайте виртуальное окружение и установите зависимости:
   ```bash
   cd backend
   python -m venv .venv
   source .venv/bin/activate
   pip install -r requirements.txt
   ```
3. Экспортируйте переменные окружения (значения можно взять из `docker-compose.yaml`):
   ```bash
   export DATABASE_URL="postgresql://postgres:password@localhost:5432/californiagold"
   export MINIO_ENDPOINT="localhost:9000"
   export MINIO_ACCESS_KEY="minioadmin"
   export MINIO_SECRET_KEY="minioadmin"
   export ML_SERVICE_URL="http://localhost:8080"
   export ML_SERVICE_TOKEN="change_me_secure_token"
   export ML_DEFAULT_PROFILE="fast_debug"
   export ML_DECISION_THRESHOLD="0.55"
   ```
4. Запустите приложение:
   ```bash
   uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
   ```

### Frontend (React + Vite)
1. Установите Node.js 22.x (совместимо с образом `node:22-bullseye`).
2. Установите зависимости и запустите dev-сервер:
   ```bash
   cd frontend
   npm install
   VITE_BACKEND_URL=http://localhost:8000 npm run dev -- --host 0.0.0.0 --port 5173
   ```
   При локальной разработке можно настроить `VITE_BACKEND_URL` через файл `.env`.

### ML сервис
- Для локальной разработки рекомендуется использовать Docker-контейнер:
  ```bash
  docker compose up ml-service
  ```
- При самостоятельном запуске вне Docker повторите шаги из контейнерной сборки: установите зависимости модели, настройте доступ к MinIO и укажите URL backend через переменные окружения.

## Структура репозитория
```
.
├── backend/           # FastAPI приложение и миграции
├── frontend/          # Vite-проект с клиентским интерфейсом
├── ml/                # Сборка ML сервиса
└── docker-compose.yaml
```

## Полезные ссылки
- Документация FastAPI: https://fastapi.tiangolo.com/
- Документация Vite: https://vitejs.dev/
- Документация MinIO: https://min.io/docs/
