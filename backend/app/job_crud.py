from sqlalchemy.orm import Session
from . import models, schemas
from typing import Optional, List
import uuid
import json

from sqlalchemy.orm import joinedload

def get_job(db: Session, job_id: int) -> Optional[models.Job]:
    """Получает задание по ID"""
    return db.query(models.Job).filter(models.Job.id == job_id).first()

def get_job_by_uuid(db: Session, job_uuid: str) -> Optional[models.Job]:
    """Получает задание по UUID"""
    try:
        uuid_value = uuid.UUID(str(job_uuid))
    except (ValueError, TypeError):
        return None
    return db.query(models.Job).filter(models.Job.uuid == uuid_value).first()

def get_jobs_by_owner(
    db: Session,
    owner_id: Optional[int] = None,
    *,
    owner_username: Optional[str] = None,
    skip: int = 0,
    limit: int = 100,
) -> List[models.Job]:
    """Получает задания пользователя с пагинацией.

    Допускает выбор по идентификатору пользователя или по username, что
    упрощает использование с текущим механизмом авторизации.
    """

    query = db.query(models.Job).options(joinedload(models.Job.owner))

    if owner_id is not None:
        query = query.filter(models.Job.owner_id == owner_id)
    elif owner_username is not None:
        query = query.join(models.Job.owner).filter(models.User.username == owner_username)
    else:
        return []

    query = query.order_by(models.Job.created_at.desc())

    skip_value = max(skip, 0)
    limit_value = max(limit, 0) if limit is not None else None

    if limit_value:
        query = query.offset(skip_value).limit(limit_value)
    else:
        query = query.offset(skip_value)

    return query.all()

def create_job(db: Session, job: schemas.JobCreate, owner_id: int) -> models.Job:
    """Создает новое задание"""
    db_job = models.Job(
        title=job.title,
        description=job.description,
        file_type="single",
        owner_id=owner_id,
        uuid=uuid.uuid4()
    )
    db.add(db_job)
    db.commit()
    db.refresh(db_job)
    return db_job

def update_job(db: Session, job_id: int, job_update: schemas.JobUpdate) -> Optional[models.Job]:
    """Обновляет задание"""
    db_job = get_job(db, job_id)
    if not db_job:
        return None
    
    update_data = job_update.dict(exclude_unset=True)
    for field, value in update_data.items():
        setattr(db_job, field, value)
    
    db.commit()
    db.refresh(db_job)
    return db_job

def update_job_file_info(db: Session, job_id: int, file_name: str, file_size: int, file_content_type: str, file_path: str, file_type: str = "single", zip_contents: Optional[List[dict]] = None) -> Optional[models.Job]:
    """Обновляет информацию о файле в задании"""
    db_job = get_job(db, job_id)
    if not db_job:
        return None
    
    db_job.file_name = file_name
    db_job.file_size = file_size
    db_job.file_content_type = file_content_type
    db_job.file_path = file_path
    db_job.file_type = file_type
    
    # Сохраняем содержимое ZIP архива как JSON
    if zip_contents:
        db_job.zip_contents = json.dumps(zip_contents, ensure_ascii=False)
    
    db.commit()
    db.refresh(db_job)
    return db_job

def update_job_status(db: Session, job_id: int, status: str) -> Optional[models.Job]:
    """Обновляет статус задания"""
    db_job = get_job(db, job_id)
    if not db_job:
        return None
    
    db_job.status = status
    if status in {"completed", "succeeded", "success"}:
        from sqlalchemy.sql import func
        db_job.completed_at = func.now()
    
    db.commit()
    db.refresh(db_job)
    return db_job

def delete_job(db: Session, job_id: int) -> bool:
    """Удаляет задание"""
    db_job = get_job(db, job_id)
    if not db_job:
        return False
    
    db.delete(db_job)
    db.commit()
    return True