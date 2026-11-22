@extends('layouts.app')

@section('title', 'NPCCSM Academic Portal')

@section('body')
<main class="min-h-screen overflow-hidden bg-gradient-to-b from-[#fff9f8] via-white to-[#fff3f2]">
    <nav class="mx-auto flex max-w-7xl items-center justify-between px-6 py-5 lg:px-10" aria-label="Main navigation">
        <a href="{{ route('landing') }}" class="flex items-center gap-3">
            <span class="flex h-11 w-11 items-center justify-center rounded-xl bg-gradient-to-br from-[#9f2929] to-[#b64b4b] text-white shadow-lg">
                <i class="fa-solid fa-graduation-cap"></i>
            </span>
            <span>
                <strong class="block text-lg leading-none text-slate-900">NPCCSM</strong>
                <small class="mt-1 block text-xs text-slate-500">Academic Portal</small>
            </span>
        </a>
        <a href="{{ route('login') }}" class="rounded-xl bg-[#a52a2a] px-5 py-3 text-sm font-bold text-white shadow-lg shadow-red-900/10 transition hover:-translate-y-0.5 hover:bg-[#8f2424]">
            Portal Login
        </a>
    </nav>

    <section class="mx-auto grid max-w-7xl items-center gap-12 px-6 py-16 lg:grid-cols-[1.08fr_.92fr] lg:px-10 lg:py-24">
        <div>
            <div class="mb-6 inline-flex items-center gap-2 rounded-full border border-red-200 bg-white px-4 py-2 text-xs font-bold uppercase tracking-widest text-[#9f2929] shadow-sm">
                <i class="fa-solid fa-shield-halved"></i>
                Secure role-based campus portal
            </div>
            <h1 class="max-w-3xl text-5xl font-extrabold leading-[1.05] tracking-tight text-slate-900 sm:text-6xl">
                One portal for smarter <span class="text-[#a52a2a]">academic delivery</span>
            </h1>
            <p class="mt-6 max-w-2xl text-lg leading-8 text-slate-600">
                Track curriculum coverage, publish lecture updates, monitor institutional progress, and use academic AI guidance in a unified MySQL-powered platform.
            </p>
            <div class="mt-8 flex flex-wrap gap-3">
                <a href="{{ route('login') }}" class="rounded-xl bg-[#a52a2a] px-6 py-3.5 text-sm font-bold text-white shadow-lg transition hover:-translate-y-0.5">
                    Enter your portal <i class="fa-solid fa-arrow-right ml-2"></i>
                </a>
                <a href="#roles" class="rounded-xl border border-slate-200 bg-white px-6 py-3.5 text-sm font-bold text-slate-700 shadow-sm transition hover:-translate-y-0.5">
                    Explore roles
                </a>
            </div>
        </div>

        <div class="relative">
            <div class="absolute -inset-10 rounded-full bg-red-100/60 blur-3xl"></div>
            <div class="relative rounded-[2rem] border border-red-100 bg-white p-5 shadow-[0_30px_80px_-30px_rgba(127,29,29,.35)]">
                <div class="rounded-2xl bg-slate-950 p-5 text-white">
                    <div class="flex items-center justify-between">
                        <span class="text-xs font-bold uppercase tracking-widest text-slate-400">Semester overview</span>
                        <span class="rounded-full bg-emerald-400/15 px-3 py-1 text-xs font-bold text-emerald-300">Live</span>
                    </div>
                    <div class="mt-6 grid grid-cols-3 gap-3">
                        @foreach ([['Students','3 Roles'],['Curriculum','6 Semesters'],['Assistant','AI RAG']] as [$label, $value])
                            <div class="rounded-xl border border-white/10 bg-white/5 p-4">
                                <p class="text-xs text-slate-400">{{ $label }}</p>
                                <p class="mt-2 text-sm font-bold">{{ $value }}</p>
                            </div>
                        @endforeach
                    </div>
                </div>
            </div>
        </div>
    </section>

    <section id="roles" class="border-t border-red-100/70 bg-white/70">
        <div class="mx-auto max-w-7xl px-6 py-16 lg:px-10">
            <div class="mb-10 text-center">
                <p class="text-xs font-bold uppercase tracking-[0.25em] text-[#a52a2a]">Choose your workspace</p>
                <h2 class="mt-3 text-3xl font-extrabold text-slate-900">Purpose-built for every role</h2>
            </div>
            <div class="grid gap-5 md:grid-cols-3">
                @foreach ([
                    ['student','Student','Track syllabus, subjects, projects, resources, and career guidance','fa-user-graduate','#2563eb'],
                    ['teacher','Faculty','Publish lecture coverage, mandatory notes, and submission history','fa-chalkboard-user','#059669'],
                    ['principal','Principal','Monitor semester delivery and identify academic gaps','fa-user-tie','#7c3aed'],
                ] as [$role, $title, $description, $icon, $color])
                    <a href="{{ route('login', ['role' => $role]) }}" class="group rounded-2xl border border-slate-200 bg-white p-6 shadow-sm transition duration-300 hover:-translate-y-1 hover:shadow-xl">
                        <span class="flex h-12 w-12 items-center justify-center rounded-xl text-white shadow-md" style="background: {{ $color }}">
                            <i class="fa-solid {{ $icon }}"></i>
                        </span>
                        <h3 class="mt-5 text-xl font-bold text-slate-900">{{ $title }}</h3>
                        <p class="mt-2 min-h-14 text-sm leading-6 text-slate-500">{{ $description }}</p>
                        <span class="mt-5 inline-flex items-center text-sm font-bold" style="color: {{ $color }}">
                            Open login <i class="fa-solid fa-arrow-right ml-2 transition group-hover:translate-x-1"></i>
                        </span>
                    </a>
                @endforeach
            </div>
        </div>
    </section>
</main>
@endsection
