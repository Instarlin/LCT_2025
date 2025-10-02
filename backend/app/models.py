from sqlalchemy import Column, Integer, String, DateTime, Boolean, Text, ForeignKey, UUID
from sqlalchemy.sql import func
from sqlalchemy.orm import relationship
import uuid
from .database import Base

class User(Base):
    __tablename__ = "users"
    
    id = Column(Integer, primary_key=True, index=True)
    username = Column(String(50), unique=True, index=True, nullable=False)
    hashed_password = Column(String(255), nullable=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())
    jobs = relationship("Job", back_populates="owner")

class Job(Base):
    __tablename__ = "jobs"
    
    id = Column(Integer, primary_key=True, index=True)
    uuid = Column(UUID(as_uuid=True), default=uuid.uuid4, unique=True, index=True)
    title = Column(String(200), nullable=True)
    description = Column(Text, nullable=True)
    status = Column(String(50), default="pending")  # pending, processing, completed, failed
    file_path = Column(String(500), nullable=True)  # Путь к файлу в MinIO
    file_name = Column(String(255), nullable=True)  # Оригинальное имя файла
    file_size = Column(Integer, nullable=True)  # Размер файла в байтах
    file_content_type = Column(String(100), nullable=True)  # MIME тип файла
    file_type = Column(String(20), default="single")  # single, zip
    zip_contents = Column(Text, nullable=True)  # JSON список файлов в ZIP архиве
    results_payload = Column(Text, nullable=True)
    results_parsed_at = Column(DateTime(timezone=True), nullable=True)
    owner_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())
    completed_at = Column(DateTime(timezone=True), nullable=True)
    owner = relationship("User", back_populates="jobs")
