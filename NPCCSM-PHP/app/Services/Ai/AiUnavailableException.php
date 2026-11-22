<?php

namespace App\Services\Ai;

use RuntimeException;

/**
 * A typed failure from the AI provider. `reason` is safe to show to users;
 * the provider's raw response is only logged.
 */
class AiUnavailableException extends RuntimeException
{
    public const NOT_CONFIGURED = 'not_configured';
    public const RATE_LIMITED = 'rate_limited';
    public const TIMEOUT = 'timeout';
    public const UPSTREAM = 'upstream_error';
    public const AUTH = 'auth_failed';

    public function __construct(public readonly string $reason, string $message, public readonly ?int $retryAfter = null)
    {
        parent::__construct($message);
    }

    public function userMessage(): string
    {
        return match ($this->reason) {
            self::NOT_CONFIGURED => 'The AI assistant is not configured yet. Please ask the administrator to add the Groq API key.',
            self::RATE_LIMITED => 'The AI assistant is receiving too many requests. Please try again in a moment.',
            self::TIMEOUT => 'The AI assistant took too long to respond. Please try again.',
            self::AUTH => 'The AI assistant could not authenticate with its provider. Please inform the administrator.',
            default => 'The AI assistant is temporarily unavailable. Please try again shortly.',
        };
    }
}
