@extends('layouts.app')

@section('title', 'Sign in · NPCCSM')

@section('body')
<main class="relative flex min-h-screen items-center justify-center overflow-hidden bg-gradient-to-b from-[#fff8f7] via-white to-[#fff0ef] p-4">
    <div class="pointer-events-none absolute -left-24 top-12 h-72 w-72 rounded-full bg-[#a52a2a]/10 blur-3xl"></div>
    <div class="pointer-events-none absolute -right-20 bottom-8 h-80 w-80 rounded-full bg-[#c46060]/10 blur-3xl"></div>
    <div class="relative z-10 grid w-full max-w-5xl gap-10 lg:grid-cols-2">
        <section class="flex flex-col justify-center space-y-8">
            <div class="flex items-center gap-4">
                <div class="flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-[#a52a2a] to-[#b24848] text-white shadow-lg">
                    <i class="fa-solid fa-graduation-cap text-2xl"></i>
                </div>
                <div>
                    <p class="text-xl font-bold tracking-tight text-slate-800">NPCCSM</p>
                    <p class="text-xs font-medium text-slate-400">Academic Command Center</p>
                </div>
            </div>
            <div>
                <h1 class="text-4xl font-extrabold tracking-tight text-slate-800 sm:text-5xl">Welcome Back</h1>
                <p class="mt-4 max-w-md text-lg leading-relaxed text-slate-600">Your academic companion for syllabus coverage, lecture updates, and learning guidance.</p>
            </div>
            <div class="grid gap-4 sm:grid-cols-3">
                @foreach ([['3 Roles', 'Student, Faculty, Admin', 'fa-users'], ['6 Semesters', 'BCA Curriculum', 'fa-layer-group'], ['AI Powered', 'Academic Guidance', 'fa-bolt']] as [$label, $description, $icon])
                    <div class="rounded-2xl border border-[#b24848]/15 bg-white p-4 shadow-sm">
                        <div class="mb-3 inline-flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-[#b24848] to-[#c46060] text-white">
                            <i class="fa-solid {{ $icon }}"></i>
                        </div>
                        <p class="font-bold text-slate-800">{{ $label }}</p>
                        <p class="mt-1 text-xs text-slate-400">{{ $description }}</p>
                    </div>
                @endforeach
            </div>
        </section>

        <section class="flex items-center justify-center">
            <div class="w-full max-w-md rounded-3xl border border-[#b24848]/15 bg-white p-8 shadow-[0_20px_40px_-12px_rgba(165,42,42,0.15)]">
                <div class="mb-7">
                    <div class="mb-4 inline-flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br from-[#a52a2a] to-[#b24848] text-white shadow-md">
                        <i class="fa-solid fa-user"></i>
                    </div>
                    <h2 class="text-2xl font-bold text-slate-800">Sign In</h2>
                    <p class="mt-1 text-sm text-slate-400">Use your reset-enabled portal credentials.</p>
                </div>

                @if (session('status'))
                    <div class="mb-4 rounded-xl border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-800" role="status">{{ session('status') }}</div>
                @endif
                @if ($errors->any())
                    <div class="mb-4 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700" role="alert">
                        <p>{{ $errors->first() }}</p>
                    </div>
                @endif

                <form method="post" action="{{ route('login.store') }}" class="space-y-4">
                    @csrf
                    <div>
                        <label for="role" class="mb-2 block text-xs font-bold uppercase tracking-wider text-slate-500">Account type</label>
                        <select id="role" name="role" required class="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-800 outline-none focus:border-[#b24848] focus:ring-2 focus:ring-[#b24848]/15">
                            @php($selectedRole = old('role', request('role', 'student')))
                            <option value="student" @selected($selectedRole === 'student')>Student</option>
                            <option value="teacher" @selected($selectedRole === 'teacher')>Faculty</option>
                            <option value="principal" @selected($selectedRole === 'principal')>Principal / Administrator</option>
                        </select>
                    </div>
                    <div>
                        <label for="username" class="mb-2 block text-xs font-bold uppercase tracking-wider text-slate-500">Username</label>
                        <input id="username" name="username" value="{{ old('username') }}" autocomplete="username" required autofocus maxlength="255" class="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-800 outline-none focus:border-[#b24848] focus:ring-2 focus:ring-[#b24848]/15">
                    </div>
                    <div>
                        <label for="password" class="mb-2 block text-xs font-bold uppercase tracking-wider text-slate-500">Password</label>
                        <input id="password" name="password" type="password" autocomplete="current-password" required class="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-800 outline-none focus:border-[#b24848] focus:ring-2 focus:ring-[#b24848]/15">
                    </div>
                    <button type="submit" class="w-full rounded-xl bg-gradient-to-r from-[#a52a2a] to-[#b24848] px-4 py-3.5 text-sm font-bold uppercase tracking-wider text-white shadow-lg transition hover:-translate-y-0.5 hover:shadow-xl focus:outline-none focus:ring-2 focus:ring-[#b24848] focus:ring-offset-2">
                        Sign In <i class="fa-solid fa-arrow-right ml-2 text-xs"></i>
                    </button>
                </form>

                <p class="mt-6 text-center text-xs text-slate-400">Legacy accounts require a password reset before PHP portal access.</p>
            </div>
        </section>
    </div>
</main>
@endsection
