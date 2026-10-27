<?php

declare(strict_types=1);

namespace Mvr\Domain;

enum Role: string
{
    case Admin = 'admin';
    case Player = 'player';
}
