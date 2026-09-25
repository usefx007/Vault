from typing import Optional, List
from pydantic import BaseModel, Field, validator
import re

EMAIL_REGEX = re.compile(r'^[a-zA-Z0-9_.+-]+@[a-zA-Z0-9-]+\.[a-zA-Z0-9-.]+$')

def validate_email_str(v: str) -> str:
    if not isinstance(v, str):
        raise ValueError("Invalid email format")
    v = v.strip().lower()
    if not EMAIL_REGEX.match(v) or len(v) > 254:
        raise ValueError("Invalid email address")
    return v

class UserRegister(BaseModel):
    name: str = Field(..., min_length=1, max_length=100)
    email: str
    password: str = Field(..., min_length=8, max_length=128)

    @validator('email')
    def email_valid(cls, v):
        return validate_email_str(v)

    @validator('name')
    def sanitize_name(cls, v):
        v = v.strip()
        if not v:
            raise ValueError("Name cannot be empty")
        return v

class UserLogin(BaseModel):
    email: str
    password: str

    @validator('email')
    def email_valid(cls, v):
        return validate_email_str(v)

class GoogleLoginRequest(BaseModel):
    email: str
    name: Optional[str] = "Google User"
    google_id: Optional[str] = None

    @validator('email')
    def email_valid(cls, v):
        return validate_email_str(v)

class ForgotPasswordRequest(BaseModel):
    email: str

    @validator('email')
    def email_valid(cls, v):
        return validate_email_str(v)

class ResetPasswordRequest(BaseModel):
    token: str
    new_password: str = Field(..., min_length=8, max_length=128)

class VaultEntryCreate(BaseModel):
    name: str = Field(..., min_length=1, max_length=200)
    url: str = Field(..., max_length=2000)
    username: str = Field(..., min_length=1, max_length=250)
    password: str = Field(..., min_length=1, max_length=1000)
    note: Optional[str] = Field(default="", max_length=5000)
    category_id: Optional[str] = None

    @validator('name', 'username')
    def check_non_empty(cls, v):
        v = v.strip()
        if not v:
            raise ValueError("Field cannot be empty")
        return v

    @validator('url')
    def validate_url(cls, v):
        v = v.strip()
        if v and not (v.startswith("http://") or v.startswith("https://")):
            v = "https://" + v
        return v

class VaultEntryUpdate(BaseModel):
    name: Optional[str] = Field(None, min_length=1, max_length=200)
    url: Optional[str] = Field(None, max_length=2000)
    username: Optional[str] = Field(None, min_length=1, max_length=250)
    password: Optional[str] = Field(None, min_length=1, max_length=1000)
    note: Optional[str] = Field(None, max_length=5000)
    category_id: Optional[str] = None

class VaultEntryMoveCategory(BaseModel):
    category_id: Optional[str] = None

class VaultOrderUpdate(BaseModel):
    order: List[str]

class CategoryCreate(BaseModel):
    name: str = Field(..., min_length=1, max_length=50)

    @validator('name')
    def sanitize_cat(cls, v):
        v = v.strip()
        if not v:
            raise ValueError("Category name cannot be empty")
        return v

class CategoryUpdate(BaseModel):
    name: str = Field(..., min_length=1, max_length=50)

    @validator('name')
    def sanitize_cat(cls, v):
        v = v.strip()
        if not v:
            raise ValueError("Category name cannot be empty")
        return v

class UpdateNameRequest(BaseModel):
    name: str = Field(..., min_length=1, max_length=100)

class RequestEmailChange(BaseModel):
    new_email: str

    @validator('new_email')
    def email_valid(cls, v):
        return validate_email_str(v)

class ChangePasswordRequest(BaseModel):
    current_password: str
    new_password: str = Field(..., min_length=8, max_length=128)
    confirm_new_password: str

class UpdatePreferences(BaseModel):
    view_preference: Optional[str] = Field(None, regex="^(list|cards)$")
    sort_preference: Optional[str] = Field(None, regex="^(name_asc|name_desc|recently_added_desc|recently_added_asc|recently_updated_desc|category|custom)$")
    language: Optional[str] = Field(None, regex="^(en|ar)$")
    theme: Optional[str] = Field(None, regex="^(dark|light|system)$")

class DeleteAccountRequest(BaseModel):
    confirmation: str
