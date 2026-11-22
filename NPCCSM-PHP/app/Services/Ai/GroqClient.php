<?php

namespace App\Services\Ai;

use Illuminate\Http\Client\ConnectionException;
use Illuminate\Http\Client\Response;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;

/**
 * Minimal client for Groq's OpenAI-compatible Chat Completions API.
 * The API key is read from config (never env() at runtime) and never leaves
 * the server.
 */
class GroqClient
{
    public function __construct(
        private readonly ?string $apiKey,
        private readonly string $model,
        private readonly string $baseUrl,
        private readonly int $timeout,
        private readonly int $maxTokens,
    ) {
    }

    public static function fromConfig(): self
    {
        $c = config('services.groq');

        return new self(
            $c['api_key'] ?: null,
            (string) $c['model'],
            rtrim((string) $c['base_url'], '/'),
            max(5, (int) $c['timeout']),
            max(64, (int) $c['max_tokens']),
        );
    }

    public function isConfigured(): bool
    {
        return (bool) $this->apiKey;
    }

    public function model(): string
    {
        return $this->model;
    }

    /**
     * @param  array<int, array{role: string, content: string}>  $messages
     */
    public function chat(array $messages, float $temperature = 0.3): string
    {
        if (! $this->isConfigured()) {
            throw new AiUnavailableException(AiUnavailableException::NOT_CONFIGURED, 'GROQ_API_KEY is not set.');
        }

        try {
            $response = Http::withToken($this->apiKey)
                ->acceptJson()
                ->timeout($this->timeout)
                ->connectTimeout(10)
                // One retry for transient network errors / 5xx. 4xx (incl. 429) are not retried.
                ->retry(2, 500, fn ($e) => $e instanceof ConnectionException
                    || ($e instanceof \Illuminate\Http\Client\RequestException && $e->response->serverError()), throw: false)
                ->post($this->baseUrl.'/chat/completions', [
                    'model' => $this->model,
                    'messages' => $messages,
                    'temperature' => $temperature,
                    'max_completion_tokens' => $this->maxTokens,
                ]);
        } catch (ConnectionException $e) {
            Log::warning('Groq request timed out or could not connect', ['error' => $e->getMessage()]);
            throw new AiUnavailableException(AiUnavailableException::TIMEOUT, 'Groq connection failed.');
        }

        if (! $response->successful()) {
            $this->throwForResponse($response);
        }

        $text = trim((string) data_get($response->json(), 'choices.0.message.content', ''));

        if ($text === '') {
            throw new AiUnavailableException(AiUnavailableException::UPSTREAM, 'Groq returned an empty completion.');
        }

        return $text;
    }

    private function throwForResponse(Response $response): never
    {
        $status = $response->status();
        // Log the provider's error message, never the request (it carries the key header).
        Log::warning('Groq API error', [
            'status' => $status,
            'model' => $this->model,
            'error' => data_get($response->json(), 'error.message'),
        ]);

        throw match (true) {
            $status === 429 => new AiUnavailableException(
                AiUnavailableException::RATE_LIMITED,
                'Groq rate limit reached.',
                (int) ($response->header('retry-after') ?: 0) ?: null,
            ),
            $status === 401 || $status === 403 => new AiUnavailableException(AiUnavailableException::AUTH, 'Groq rejected the API key.'),
            default => new AiUnavailableException(AiUnavailableException::UPSTREAM, "Groq returned HTTP {$status}."),
        };
    }
}
