@extends('layouts.app')

@section('title', 'Access denied · NPCCSM')

@section('body')
<main class="flex min-h-screen items-center justify-center p-6">
    <div class="max-w-lg rounded-2xl border border-slate-200 bg-white p-8 text-center shadow-sm">
        <i class="fa-solid fa-lock text-3xl text-[#8B2635]"></i>
        <h1 class="mt-4 text-2xl font-black text-slate-900">Access denied</h1>
        <p class="mt-2 text-sm text-slate-500">Your account does not have permission to open this page.</p>
        <a href="{{ route('login') }}" class="mt-6 inline-flex rounded-xl bg-[#8B2635] px-4 py-2 text-sm font-bold text-white">Return to sign in</a>
    </div>
</main>
@endsection
