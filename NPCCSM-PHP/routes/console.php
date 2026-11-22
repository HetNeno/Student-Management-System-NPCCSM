<?php

use App\Models\User;
use Illuminate\Support\Facades\Artisan;
use Illuminate\Support\Facades\Validator;
use Illuminate\Validation\Rule;
use Illuminate\Validation\Rules\Password;

Artisan::command('npccsm:status', function (): void {
    $this->info('NPCCSM Laravel portal is configured.');
})->purpose('Check the NPCCSM Laravel command setup');

/*
 * The only way to create a principal account (and a convenient way to create
 * teachers). Runs on the server, so it is never reachable from the browser.
 * The password is read with a hidden prompt and never echoed or logged.
 */
Artisan::command('npccsm:create-user {--role= : principal or teacher} {--email=} {--name=} {--department=BCA}', function (): int {
    $role = $this->option('role') ?: $this->choice('Role', [User::ROLE_PRINCIPAL, User::ROLE_TEACHER], 0);
    $email = strtolower(trim((string) ($this->option('email') ?: $this->ask('Email'))));
    $name = trim((string) ($this->option('name') ?: $this->ask('Full name')));
    $password = (string) $this->secret('Password (min 8 chars, letters and numbers)');
    $confirm = (string) $this->secret('Confirm password');

    $validator = Validator::make(
        compact('role', 'email', 'name', 'password') + ['password_confirmation' => $confirm, 'department' => $this->option('department')],
        [
            'role' => ['required', Rule::in([User::ROLE_PRINCIPAL, User::ROLE_TEACHER])],
            'email' => ['required', 'email:rfc', 'max:255', 'unique:users,email', 'unique:users,username'],
            'name' => ['required', 'string', 'min:2', 'max:120'],
            'department' => ['nullable', 'in:BCA,BBA'],
            'password' => ['required', 'confirmed', Password::min(8)->letters()->numbers()],
        ]
    );

    if ($validator->fails()) {
        foreach ($validator->errors()->all() as $error) {
            $this->error($error);
        }

        return 1;
    }

    $user = new User([
        'name' => $name,
        'email' => $email,
        'username' => $email,
        'password' => $password,
        'department' => $this->option('department'),
    ]);
    $user->role = $role;
    $user->status = User::STATUS_ACTIVE;
    $user->save();

    $this->info("Created {$role} account for {$email}.");

    return 0;
})->purpose('Create a principal or teacher account (server-side provisioning)');

Artisan::command('npccsm:rag-ingest-syllabus', function (\App\Services\Rag\RagService $rag): int {
    $count = $rag->ingestSyllabus();
    $this->info("Indexed the curriculum from the courses table into {$count} RAG passages.");

    $lectures = 0;
    foreach (\App\Models\FacultyLectureUpdate::query()->cursor() as $update) {
        $lectures += $rag->indexLectureUpdate($update);
    }
    $notices = 0;
    foreach (\App\Models\Notice::query()->active()->cursor() as $notice) {
        $notices += $rag->indexNotice($notice);
    }
    $this->info("Indexed lecture updates ({$lectures} passages) and active notices ({$notices} passages).");
    $this->line('Uploaded materials are indexed automatically when uploaded.');

    return 0;
})->purpose('Index (or re-index) the curriculum, lecture updates and notices into the AI knowledge base');

Artisan::command('npccsm:groq-check', function (): int {
    $key = config('services.groq.api_key');
    $model = config('services.groq.model');
    if (! $key) {
        $this->error('GROQ_API_KEY is not set in .env.');

        return 1;
    }

    $res = \Illuminate\Support\Facades\Http::withToken($key)->acceptJson()->timeout(15)
        ->get(rtrim(config('services.groq.base_url'), '/').'/models');
    if (! $res->successful()) {
        $this->error('Groq /models returned HTTP '.$res->status().'.');

        return 1;
    }

    $ids = collect($res->json('data'))->pluck('id');
    if ($ids->contains($model)) {
        $this->info("Groq key works and model '{$model}' is available.");

        return 0;
    }

    $this->error("Model '{$model}' is not available to this key. Available: ".$ids->sort()->implode(', '));

    return 1;
})->purpose('Verify the Groq API key and that GROQ_MODEL is available');
