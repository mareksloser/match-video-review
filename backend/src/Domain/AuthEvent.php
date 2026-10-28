<?php

declare(strict_types=1);

namespace Mvr\Domain;

enum AuthEvent: string
{
    case LoginSuccess = 'login_success';
    case LoginFailed = 'login_failed';
    /** Attempt refused because the IP made too many failed attempts. */
    case LoginBlocked = 'login_blocked';
    case UserCreated = 'user_created';
    case UserUpdated = 'user_updated';
    case PasswordChanged = 'password_changed';
    case UserDeleted = 'user_deleted';
}
