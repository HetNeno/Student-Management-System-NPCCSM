@extends('layouts.app')

@section('title', 'Student Dashboard · NPCCSM')

@section('body')
<main class="mx-auto min-h-screen max-w-7xl p-6">
    <div class="mb-8 flex items-center justify-between">
        <div>
            <p class="text-xs font-bold uppercase tracking-widest text-[#a52a2a]">Student workspace</p>
            <h1 class="mt-2 text-3xl font-extrabold text-slate-900">Welcome, {{ auth()->user()->name }}</h1>
        </div>
        <form method="post" action="{{ route('logout') }}">
            @csrf
            <button class="rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-bold text-slate-700">Sign out</button>
        </form>
    </div>
    <section class="grid gap-5 md:grid-cols-3">
        @foreach ($courses as $course)
            <article class="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
                <p class="text-xs font-bold uppercase tracking-wider text-slate-400">Semester {{ $course->semester }}</p>
                <h2 class="mt-2 font-bold text-slate-900">{{ $course->title }}</h2>
                <p class="mt-2 text-sm text-slate-500">{{ $course->subject_code }}</p>
            </article>
        @endforeach
    </section>
</main>
@endsection
