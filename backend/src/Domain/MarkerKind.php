<?php

declare(strict_types=1);

namespace Mvr\Domain;

/** Stored in markers.kind (VARCHAR), so adding a case needs no migration. */
enum MarkerKind: string
{
    case Praise = 'praise';
    case Mistake = 'mistake';
    case Improvement = 'improvement';
    case Tactic = 'tactic';
    case Goal = 'goal';
    case Chance = 'chance';
    case SetPiece = 'set_piece';
    case Foul = 'foul';
    case Substitution = 'substitution';
}
