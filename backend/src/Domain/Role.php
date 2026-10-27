<?php

declare(strict_types=1);

namespace Mvr\Domain;

enum Role: string
{
    case Admin = 'admin';
    case Player = 'player';
    /** Read-only access to every match and marker, regardless of team. */
    case Viewer = 'viewer';
}
