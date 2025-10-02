import json
from datetime import datetime
import uuid
from typing import Optional

from pydantic import BaseModel, EmailStr, Field, ConfigDict, validator, field_validator

class UserBase(BaseModel):
    username: str
    email: Optional[EmailStr] = None
    full_name: Optional[str] = None
    bio: Optional[str] = None
    avatar_url: Optional[str] = None

class UserCreate(UserBase):
    password: str
    
    @validator('password')
    def validate_password(cls, v):
        if len(v) < 6:
            raise ValueError('Пароль должен содержать минимум 6 символов')
        if len(v) > 24:
            raise ValueError('Пароль слишком длинный (максимум 24 символов)')
        return v

class UserUpdate(BaseModel):
    username: Optional[str] = None

class UserResponse(UserBase):
    id: int
    created_at: datetime
    updated_at: Optional[datetime] = None
    
    class Config:
        from_attributes = True

class UserInDB(UserResponse):
    hashed_password: str

# Схемы для аутентификации
class Token(BaseModel):
    access_token: str
    token_type: str

class TokenData(BaseModel):
    username: Optional[str] = None

class UserLogin(BaseModel):
    username: str
    password: str

# Схемы для Job
class JobBase(BaseModel):
    title: Optional[str] = None
    description: Optional[str] = None


class JobCreate(JobBase):
    pass

class JobUpdate(BaseModel):
    title: Optional[str] = None
    description: Optional[str] = None
    status: Optional[str] = None

class JobResponse(BaseModel):
    id: uuid.UUID = Field(validation_alias="uuid")
    title: Optional[str] = None
    description: Optional[str] = None
    status: str
    file_name: Optional[str] = None
    file_size: Optional[int] = None
    owner_id: int
    created_at: datetime
    updated_at: Optional[datetime] = None
    results_payload: Optional[dict] = None
    results_parsed_at: Optional[datetime] = None

    model_config = ConfigDict(from_attributes=True, populate_by_name=True)

    @field_validator("results_payload", mode="before")
    @classmethod
    def _parse_results_payload(cls, value):
        if isinstance(value, str):
            try:
                return json.loads(value)
            except json.JSONDecodeError:
                return None
        return value


class JobWithOwner(JobResponse):
    owner: UserResponse


class JobCompletionPayload(BaseModel):
    status: str
    output_object: Optional[str] = None
    file_size: Optional[int] = None
    file_name: Optional[str] = None
