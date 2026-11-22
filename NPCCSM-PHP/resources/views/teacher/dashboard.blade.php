@extends('layouts.app')
@section('title', 'Faculty Dashboard · NPCCSM')
@section('body')
<main class="mx-auto min-h-screen max-w-7xl p-6">
    <div class="mb-8 flex items-center justify-between">
        <div>
            <p class="text-xs font-bold uppercase tracking-widest text-emerald-600">Faculty workspace</p>
            <h1 class="mt-2 text-3xl font-extrabold text-slate-900">{{ auth()->user()->name }}</h1>
        </div>
        <form method="post" action="{{ route('logout') }}">@csrf<button class="rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-bold text-slate-700">Sign out</button></form>
    </div>
    <div class="grid gap-5 md:grid-cols-2">
        <section class="rounded-2xl border border-slate-200 bg-white p-6">
            <h2 class="font-bold text-slate-900">Assigned curriculum</h2>
            <div class="mt-4 space-y-3">
                @foreach ($courses as $course)
                    <div class="rounded-xl bg-slate-50 p-3 text-sm"><strong>{{ $course->subject_code }}</strong> · {{ $course->title }}</div>
                @endforeach
            </div>
        </section>
        <section class="rounded-2xl border border-slate-200 bg-white p-6">
            <h2 class="font-bold text-slate-900">Recent updates</h2>
            <div class="mt-4 space-y-3">
                @forelse ($recentUpdates as $update)
                    <div class="rounded-xl bg-slate-50 p-3 text-sm">{{ $update->subject_code }} · {{ $update->lecture_date }}</div>
                @empty
                    <p class="text-sm text-slate-500">No lecture updates yet.</p>
                @endforelse
            </div>
        </section>
    </div>
</main>
@endsection
