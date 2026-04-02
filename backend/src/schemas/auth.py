from pydantic import BaseModel, EmailStr, Field


class SignUp(BaseModel):
    email: EmailStr
    password: str = Field(min_length=8, max_length=128)
    name: str = Field(min_length=1, max_length=100)


class SignIn(BaseModel):
    email: EmailStr
    password: str = Field(min_length=8, max_length=128)


class AuthResponse(BaseModel):
    access_token: str
    user_name: str
    token_type: str = "bearer"


class UserMe(BaseModel):
    id: str
    email: EmailStr
    name: str


class PasswordResetRequest(BaseModel):
    email: EmailStr


class PasswordResetConfirm(BaseModel):
    email: EmailStr
    code: str = Field(min_length=6, max_length=6)
    new_password: str = Field(min_length=8, max_length=128)


class PasswordResetVerify(BaseModel):
    email: EmailStr
    code: str = Field(min_length=6, max_length=6)


class ChangePassword(BaseModel):
    old_password: str = Field(min_length=8, max_length=128)
    new_password: str = Field(min_length=8, max_length=128)


class UpdateName(BaseModel):
    name: str = Field(min_length=1, max_length=100)


class UpdateEmail(BaseModel):
    new_email: EmailStr
    password: str = Field(min_length=8, max_length=128)
