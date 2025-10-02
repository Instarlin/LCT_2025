# ML Сервис

## Обзор

ML сервис - это отдельный Docker контейнер, который отвечает за выполнение машинного обучения и анализ медицинских изображений. Сервис интегрируется с backend через HTTP API и использует MinIO для хранения файлов.

## Архитектура

### Компоненты
- **HTTP API** - REST API для получения заданий
- **ML Model** - Модель машинного обучения
- **Inference Engine** - Движок для выполнения инференса
- **MinIO Client** - Клиент для работы с файловым хранилищем

### Поток данных
1. Backend отправляет задание на анализ
2. ML сервис загружает файл из MinIO
3. Выполняется анализ с помощью ML модели
4. Результаты сохраняются в MinIO
5. ML сервис уведомляет backend о завершении

## API Эндпоинты

### POST /infer
Выполнение анализа медицинского изображения.

**Тело запроса:**
```json
{
  "job_uuid": "550e8400-e29b-41d4-a716-446655440000",
  "input_object": "uploads/scan.dcm",
  "output_object": "results/analysis_550e8400.nii.gz",
  "profile": "fast_debug",
  "threshold": 0.55
}
```

**Параметры:**
- `job_uuid` (string): UUID задания
- `input_object` (string): Путь к входному файлу в MinIO
- `output_object` (string, optional): Путь для сохранения результата
- `profile` (string, optional): Профиль обработки (по умолчанию: "fast_debug")
- `threshold` (float, optional): Порог принятия решений (по умолчанию: 0.55)

**Ответ:**
```json
{
  "job_uuid": "550e8400-e29b-41d4-a716-446655440000",
  "output_object": "results/analysis_550e8400.nii.gz",
  "file_size": 2048000,
  "duration_seconds": 45.2,
  "status": "completed"
}
```

### GET /health
Проверка здоровья ML сервиса.

**Ответ:**
```json
{
  "status": "healthy",
  "model_loaded": true,
  "version": "1.0.0"
}
```

## Профили обработки

### fast_debug
- **Назначение**: Быстрая отладка и тестирование
- **Время обработки**: 10-30 секунд
- **Точность**: Базовая
- **Использование**: Разработка и тестирование

### production
- **Назначение**: Продакшн обработка
- **Время обработки**: 2-5 минут
- **Точность**: Высокая
- **Использование**: Реальные медицинские данные

### research
- **Назначение**: Исследовательские задачи
- **Время обработки**: 10-30 минут
- **Точность**: Максимальная
- **Использование**: Научные исследования

## Поддерживаемые форматы

### Входные форматы
- **DICOM** (.dcm) - Стандарт медицинских изображений
- **NIfTI** (.nii, .nii.gz) - Формат нейровизуализации
- **ZIP архивы** - Содержащие DICOM файлы

### Выходные форматы
- **NIfTI** (.nii.gz) - Сегментационные маски
- **JSON** - Метаданные и результаты
- **Excel** (.xlsx) - Детальные отчеты

## Результаты анализа

### Структура результатов
```json
{
  "summary": {
    "total_volume": 1500.5,
    "lesions_count": 3,
    "confidence": 0.92,
    "processing_time": 45.2
  },
  "findings": [
    {
      "id": "lesion_1",
      "type": "lesion",
      "volume": 500.2,
      "confidence": 0.95,
      "location": {
        "x": 100,
        "y": 200,
        "z": 150
      },
      "bounding_box": {
        "min_x": 90,
        "max_x": 110,
        "min_y": 190,
        "max_y": 210,
        "min_z": 140,
        "max_z": 160
      }
    }
  ],
  "metrics": [
    {
      "name": "dice_score",
      "value": 0.89,
      "description": "Dice similarity coefficient"
    },
    {
      "name": "hausdorff_distance",
      "value": 2.3,
      "description": "Hausdorff distance in mm"
    }
  ],
  "segmentation": {
    "file_path": "results/segmentation_550e8400.nii.gz",
    "format": "nifti",
    "dimensions": [512, 512, 256],
    "spacing": [0.5, 0.5, 1.0]
  }
}
```

### Метаданные
- **Общий объем**: Общий объем обнаруженных поражений
- **Количество поражений**: Количество найденных аномалий
- **Уверенность**: Общая уверенность модели
- **Время обработки**: Время выполнения анализа

### Находки (Findings)
- **ID**: Уникальный идентификатор находки
- **Тип**: Тип обнаруженной аномалии
- **Объем**: Объем в кубических миллиметрах
- **Уверенность**: Уверенность модели в находке
- **Расположение**: Координаты центра находки
- **Ограничивающий прямоугольник**: Границы находки

### Метрики качества
- **Dice Score**: Коэффициент сходства Dice
- **Hausdorff Distance**: Расстояние Хаусдорфа
- **Sensitivity**: Чувствительность
- **Specificity**: Специфичность

## Конфигурация

### Переменные окружения
```bash
# MinIO настройки
MINIO_ENDPOINT=minio:9000
MINIO_ACCESS_KEY=minioadmin
MINIO_SECRET_KEY=minioadmin
MINIO_BUCKET=californiagold

# Backend настройки
BACKEND_URL=http://backend:8000
ML_SERVICE_TOKEN=change_me_secure_token

# ML настройки
ML_DEFAULT_PROFILE=fast_debug
ML_DECISION_THRESHOLD=0.55

# Модель
MODEL_PATH=/app/models
MODEL_NAME=medical_segmentation_v1
```

### Docker конфигурация
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

## Интеграция с Backend

### Отправка заданий
Backend отправляет задания через HTTP POST запрос:

```python
async def process_job(job_uuid: str, input_object: str) -> None:
    request = InferenceRequest(
        job_uuid=job_uuid,
        input_object=input_object,
        profile="fast_debug",
        threshold=0.55
    )
    result = await model_adapter.run_inference(request)
```

### Получение результатов
ML сервис уведомляет backend о завершении:

```python
# ML сервис отправляет результат
payload = {
    "status": "completed",
    "output_object": "results/analysis_550e8400.nii.gz",
    "file_size": 2048000,
    "file_name": "analysis_550e8400.nii.gz"
}

# Backend получает уведомление
@app.post("/internal/jobs/{job_id}/completion")
def complete_job(job_id: str, payload: JobCompletionPayload):
    # Обновление статуса задания
    # Парсинг результатов
    # Broadcast через WebSocket
```

## Обработка ошибок

### Типы ошибок
- **Ошибки загрузки файлов**: Проблемы с MinIO
- **Ошибки модели**: Проблемы с ML моделью
- **Ошибки валидации**: Некорректные входные данные
- **Таймауты**: Превышение времени обработки

### Обработка ошибок
```python
try:
    result = await model_adapter.run_inference(request)
except httpx.RequestError as exc:
    logger.exception("Could not reach ML service: %s", exc)
    # Обновление статуса на "failed"
except httpx.HTTPStatusError as exc:
    logger.exception("Inference request failed: %s", exc.response.text)
    # Обновление статуса на "failed"
```

## Мониторинг и логирование

### Логирование
- **Уровни**: DEBUG, INFO, WARNING, ERROR
- **Формат**: Структурированные JSON логи
- **Контекст**: job_uuid, processing_time, model_version

### Метрики
- **Время обработки**: Среднее время выполнения
- **Успешность**: Процент успешных обработок
- **Использование ресурсов**: CPU, память, GPU
- **Очередь заданий**: Количество ожидающих заданий

### Health Checks
```python
@app.get("/health")
async def health_check():
    return {
        "status": "healthy",
        "model_loaded": model.is_loaded(),
        "version": "1.0.0",
        "uptime": get_uptime(),
        "memory_usage": get_memory_usage()
    }
```

## Масштабирование

### Горизонтальное масштабирование
- Запуск нескольких экземпляров ML сервиса
- Балансировка нагрузки между экземплярами
- Очередь заданий для распределения нагрузки

### Вертикальное масштабирование
- Увеличение CPU и памяти контейнера
- Оптимизация модели для производительности
- Использование GPU для ускорения

### Кэширование
- Кэширование результатов для одинаковых входных данных
- Кэширование загруженных моделей
- Кэширование промежуточных вычислений

## Безопасность

### Аутентификация
- JWT токены для аутентификации с backend
- Валидация токенов на каждом запросе
- Ротация токенов для безопасности

### Изоляция
- Запуск в изолированном Docker контейнере
- Ограничение доступа к файловой системе
- Сетевая изоляция от других сервисов

### Валидация данных
- Проверка формата входных файлов
- Валидация параметров запроса
- Санитизация выходных данных

## Разработка и тестирование

### Локальная разработка
```bash
# Запуск ML сервиса локально
docker compose up ml-service

# Просмотр логов
docker compose logs -f ml-service

# Тестирование API
curl -X POST "http://localhost:8080/infer" \
  -H "Content-Type: application/json" \
  -d '{"job_uuid": "test", "input_object": "test.dcm"}'
```

### Тестирование
- Unit тесты для отдельных компонентов
- Integration тесты с MinIO и backend
- Load тесты для проверки производительности
- Validation тесты для проверки качества результатов

### Отладка
- Подробные логи для отладки
- Профилирование производительности
- Визуализация промежуточных результатов
- Интерактивные инструменты отладки
