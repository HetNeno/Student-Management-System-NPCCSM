@extends('layouts.app')
@section('title', 'Principal Dashboard · NPCCSM')
@section('body')
<main class="mx-auto min-h-screen max-w-7xl p-6">
    <div class="mb-8 flex items-center justify-between">
        <div>
            <p class="text-xs font-bold uppercase tracking-widest text-violet-600">Principal workspace</p>
            <h1 class="mt-2 text-3xl font-extrabold text-slate-900">{{ auth()->user()->name }}</h1>
        </div>
        <form method="post" action="{{ route('logout') }}">@csrf<button class="rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-bold text-slate-700">Sign out</button></form>
    </div>
    <section class="grid gap-5 md:grid-cols-3">
        @foreach ($semesterProgress as $semester)
            <article class="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
                <p class="text-xs font-bold uppercase tracking-widest text-slate-400">Semester {{ $semester->semester }}</p>
                <p class="mt-3 text-3xl font-extrabold text-slate-900">{{ $semester->subject_count }}</p>
                <p class="mt-1 text-sm text-slate-500">tracked subjects</p>
            </article>
        @endforeach
    </section>
    <section class="mt-5 rounded-2xl border border-slate-200 bg-white p-6">
        <h2 class="font-bold text-slate-900">Recent faculty updates</h2>
        <div class="mt-4 space-y-3">
            @forelse ($recentUpdates as $update)
                <div class="rounded-xl bg-slate-50 p-3 text-sm">{{ $update->subject_code }} · {{ $update->faculty_name }} · {{ $update->lecture_date }}</div>
            @empty
                <p class="text-sm text-slate-500">No lecture updates yet.</p>
            @endforelse
        </div>
    </section>
</main>
@endsection
