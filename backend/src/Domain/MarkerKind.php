<?php

declare(strict_types=1);

namespace Mvr\Domain;

enum MarkerKind: string
{
    case Tactic = 'tactic';
    case Goal = 'goal';
    case Chance = 'chance';
    case Foul = 'foul';
    case Substitution = 'substitution';
}
