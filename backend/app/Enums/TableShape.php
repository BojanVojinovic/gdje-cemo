<?php

namespace App\Enums;

enum TableShape: string
{
    case Round = 'round';
    case Square = 'square';
    case Rectangle = 'rectangle';
    case Oval = 'oval';
    case Custom = 'custom';
}
