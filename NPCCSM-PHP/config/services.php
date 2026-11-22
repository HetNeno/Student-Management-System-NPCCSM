<?php

return [
    // Groq OpenAI-compatible Chat Completions API. The key never leaves the server.
    'groq' => [
        'api_key' => env('GROQ_API_KEY'),
        'model' => env('GROQ_MODEL', 'openai/gpt-oss-120b'),
        'base_url' => env('GROQ_BASE_URL', 'https://api.groq.com/openai/v1'),
        'timeout' => (int) env('GROQ_TIMEOUT', 30),
        'max_tokens' => (int) env('GROQ_MAX_TOKENS', 1024),
    ],
];
