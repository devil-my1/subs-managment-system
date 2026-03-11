from random import randint
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from src.utils.cache import cache_get_json, cache_set_json, cache_delete_key, cache_delete_prefix
from src.utils.logs import auth_logger
from src.db.session import get_db
from src.models.user import User
from src.schemas.auth import (
    SignUp,
    SignIn,
    AuthResponse,
    UserMe,
    PasswordResetConfirm,
    PasswordResetRequest,
    PasswordResetVerify,
    ChangePassword,
)
from src.schemas.common import Message
from src.core.security import hash_password, verify_password, create_access_token
from src.api.deps import get_current_user

router = APIRouter(prefix="/auth", tags=["auth"])
RESET_TTL = 15 * 60  # seconds
RESET_MAX_ATTEMPTS = 5


def _reset_key(email: str) -> str:
    return f"reset:{email.lower()}"


@router.post("/register", response_model=AuthResponse)
async def register(data: SignUp, db: AsyncSession = Depends(get_db)):
    try:
        existing = await db.execute(select(User).where(User.email == data.email))
        if existing.scalar_one_or_none():
            raise HTTPException(
                status_code=409, detail="An account with this email already exists. Please sign in instead.")

        user = User(email=data.email, password_hash=hash_password(
            data.password), name=data.name)
        db.add(user)
        await db.commit()
        await db.refresh(user)
        auth_logger.info("user_registered", extra={
                         "user_id": str(user.id), "email": user.email})
        return AuthResponse(access_token=create_access_token(str(user.id)), user_name=user.name)
    except HTTPException:
        raise
    except TypeError:
        raise HTTPException(
            status_code=400, detail="Invalid registration data. Please check your input and try again.")
    except Exception as e:
        auth_logger.exception("user_register_error",
                              extra={"email": data.email})
        raise HTTPException(
            status_code=500, detail="Could not complete registration. Please try again later.") from e


@router.get("/me", response_model=UserMe)
async def me(user: User = Depends(get_current_user)):
    # Some legacy users may have null name; fallback to a sensible default
    return UserMe(id=str(user.id), email=user.email, name=user.name or "User")


@router.post("/login", response_model=AuthResponse)
async def login(data: SignIn, db: AsyncSession = Depends(get_db)):
    try:
        res = await db.execute(select(User).where(User.email == data.email))
        user = res.scalar_one_or_none()
        if not user or not verify_password(data.password, user.password_hash):
            raise HTTPException(
                status_code=401, detail="Incorrect email or password. Please try again.")
        auth_logger.info("user_logged_in", extra={
                         "user_id": str(user.id), "email": user.email})
        return AuthResponse(access_token=create_access_token(str(user.id)), user_name=user.name)
    except HTTPException:
        raise
    except Exception as e:
        auth_logger.exception("user_login_error", extra={"email": data.email})
        raise HTTPException(
            status_code=500, detail="Could not sign you in. Please try again later.") from e


@router.post("/request-password-reset", response_model=Message)
async def request_password_reset(payload: PasswordResetRequest, db=Depends(get_db)):
    email = payload.email
    key = _reset_key(email)
    try:
        existing = await cache_get_json(key)
        if existing and existing.get("code"):
            return {"detail": "If the account exists, a code was sent."}

        res = await db.execute(select(User).where(User.email == email))
        user = res.scalar_one_or_none()
        code = f"{randint(0, 999999):06d}"
        if user:
            await cache_set_json(key, {"code": code, "attempts": 0}, ttl=RESET_TTL)
            auth_logger.info(f"password_reset_code_sent: {email}: {code}")
        return {"detail": "If the account exists, a code was sent."}
    except Exception as e:
        auth_logger.exception(
            "password_reset_request_error", extra={"email": email})
        raise HTTPException(
            status_code=500, detail="Could not start password reset. Please try again.") from e


@router.post("/confirm-password-reset", response_model=Message)
async def confirm_password_reset(payload: PasswordResetConfirm, db=Depends(get_db)):
    email = payload.email
    key = _reset_key(email)
    try:
        cached = await cache_get_json(key)
        if not cached:
            auth_logger.warning("password_reset_invalid_code", extra={
                                "email": email, "reason": "no_cache"})
            raise HTTPException(
                status_code=400, detail="The reset code has expired. Please request a new one.")

        if not cached.get("verified"):
            auth_logger.warning("password_reset_not_verified", extra={
                                "email": email})
            raise HTTPException(
                status_code=400, detail="Please verify your code first before setting a new password.")

        if cached.get("code") != payload.code:
            await cache_delete_key(key)
            auth_logger.warning("password_reset_code_mismatch", extra={
                                "email": email})
            raise HTTPException(
                status_code=400, detail="The reset code is invalid. Please start the process again.")

        res = await db.execute(select(User).where(User.email == email))
        user = res.scalar_one_or_none()
        if not user:
            await cache_delete_key(key)
            auth_logger.warning(
                "password_reset_user_not_found", extra={"email": email})
            raise HTTPException(
                status_code=400, detail="Could not find your account. Please try again.")

        user.password_hash = hash_password(payload.new_password)
        await db.commit()
        await cache_delete_key(key)
        await cache_delete_key(f"user:{user.id}")
        auth_logger.info("password_reset_success", extra={
                         "user_id": str(user.id), "email": user.email})
        return {"detail": "Password reset successful. You can now sign in with your new password."}
    except HTTPException:
        raise
    except Exception as e:
        auth_logger.exception(
            "password_reset_confirm_error", extra={"email": email})
        raise HTTPException(
            status_code=500, detail="Could not reset the password. Please try again.") from e


@router.post("/verify-password-reset", response_model=Message)
async def verify_password_reset(payload: PasswordResetVerify):
    email = payload.email
    key = _reset_key(email)
    try:
        cached = await cache_get_json(key)
        if not cached:
            auth_logger.warning("password_reset_invalid_code", extra={
                                "email": email, "reason": "no_cache"})
            raise HTTPException(
                status_code=400, detail="The reset code has expired. Please request a new one.")

        attempts = cached.get("attempts", 0)
        if cached.get("code") != payload.code:
            attempts += 1
            if attempts >= RESET_MAX_ATTEMPTS:
                await cache_delete_key(key)
                auth_logger.warning("password_reset_max_attempts", extra={
                                    "email": email, "attempts": attempts})
                raise HTTPException(
                    status_code=400, detail="Too many incorrect attempts. Please request a new code.")
            else:
                await cache_set_json(key, {"code": cached.get("code"), "attempts": attempts}, ttl=RESET_TTL)
            remaining = RESET_MAX_ATTEMPTS - attempts
            auth_logger.warning("password_reset_invalid_code", extra={
                                "email": email, "attempts": attempts})
            raise HTTPException(
                status_code=400,
                detail=f"Incorrect code. You have {remaining} attempt{'s' if remaining != 1 else ''} remaining.")

        await cache_set_json(key, {"code": cached.get("code"), "attempts": 0, "verified": True}, ttl=RESET_TTL)
        auth_logger.info("password_reset_code_verified",
                         extra={"email": email})
        return {"detail": "Code verified successfully."}
    except HTTPException:
        raise
    except Exception as e:
        auth_logger.exception(
            "password_reset_verify_error", extra={"email": email})
        raise HTTPException(
            status_code=500, detail="Could not verify the code. Please try again.") from e


@router.post("/change-password", response_model=Message)
async def change_password(
    payload: ChangePassword,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    try:
        if not verify_password(payload.old_password, user.password_hash):
            raise HTTPException(
                status_code=401, detail="Your current password is incorrect. Please try again.")
        if payload.old_password == payload.new_password:
            raise HTTPException(
                status_code=400, detail="Your new password must be different from the current one.")

        user.password_hash = hash_password(payload.new_password)
        await db.commit()
        await cache_delete_key(f"user:{user.id}")
        await cache_delete_prefix(_reset_key(user.email))
        await db.refresh(user)
        auth_logger.info("password_change_success", extra={
                         "user_id": str(user.id), "email": user.email})
        return {"detail": "Password change successful"}
    except HTTPException:
        raise
    except Exception as e:
        auth_logger.exception("password_change_error", extra={
                              "user_id": str(user.id) if user else None})
        raise HTTPException(
            status_code=500, detail="Could not change password. Please try again later.") from e


@router.delete("/delete-account", response_model=Message)
async def delete_account(
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    try:
        await cache_delete_key(f"user:{user.id}")
        await cache_delete_prefix(_reset_key(user.email))
        await db.delete(user)
        await db.commit()
        auth_logger.info("account_deleted", extra={
                         "user_id": str(user.id), "email": user.email})
        return {"detail": "Account deleted successfully"}
    except HTTPException:
        raise
    except Exception as e:
        auth_logger.exception("account_delete_error", extra={
                              "user_id": str(user.id) if user else None})
        raise HTTPException(
            status_code=500, detail="Could not delete the account. Please try again later.") from e
