<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Course;
use App\Models\Notice;
use App\Models\StudyMaterial;
use App\Models\User;
use App\Services\Rag\RagService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Storage;
use Illuminate\Validation\Rule;
use Smalot\PdfParser\Parser;
use Symfony\Component\HttpFoundation\StreamedResponse;
use Throwable;

/**
 * Faculty-published study materials and notices.
 * Staff create/delete; students read only their own semester (plus
 * college-wide notices). Files live on the private disk and are streamed
 * through an authorised endpoint, never served directly.
 */
class LearningContentController extends Controller
{
    private const MAX_KB = 20480; // 20 MB

    public function __construct(private readonly RagService $rag)
    {
    }

    // ── Materials ───────────────────────────────────────────────────────────

    public function materials(Request $request): JsonResponse
    {
        $filters = $request->validate([
            'subject_code' => ['nullable', 'string', 'max:255'],
            'category' => ['nullable', Rule::in(StudyMaterial::CATEGORIES)],
            'semester' => ['nullable', 'integer', 'between:1,6'],
        ]);
        $semester = $request->user()->semesterScope() ?? ($filters['semester'] ?? null);

        $items = StudyMaterial::query()
            ->with('uploader:id,name')
            ->when($semester !== null, fn ($q) => $q->where('semester', $semester))
            ->when($filters['subject_code'] ?? null, fn ($q, $v) => $q->where('subject_code', $v))
            ->when($filters['category'] ?? null, fn ($q, $v) => $q->where('category', $v))
            ->latest()
            ->limit(300)
            ->get()
            ->map(fn (StudyMaterial $m) => $this->presentMaterial($m, $request->user()));

        return response()->json(['data' => $items]);
    }

    public function storeMaterial(Request $request): JsonResponse
    {
        $data = $request->validate([
            'title' => ['required', 'string', 'min:3', 'max:255'],
            'description' => ['nullable', 'string', 'max:2000'],
            'semester' => ['required', 'integer', 'between:1,6'],
            'subject_code' => ['nullable', 'string', Rule::exists('courses', 'subject_code')],
            'category' => ['required', Rule::in(StudyMaterial::CATEGORIES)],
            'file' => [
                'required', 'file', 'max:'.self::MAX_KB,
                'mimes:pdf,doc,docx,ppt,pptx,txt,xlsx,zip',
            ],
        ]);

        if (! empty($data['subject_code'])) {
            $courseSemester = Course::query()->where('subject_code', $data['subject_code'])->value('semester');
            abort_if((int) $courseSemester !== (int) $data['semester'], 422, 'The subject does not belong to the selected semester.');
        }

        $file = $request->file('file');
        $ext = strtolower($file->getClientOriginalExtension());
        if ($ext === 'pdf') {
            $handle = fopen($file->getRealPath(), 'rb');
            $sig = $handle ? fread($handle, 5) : '';
            if ($handle) {
                fclose($handle);
            }
            abort_unless($sig === '%PDF-', 422, 'The uploaded file is not a valid PDF.');
        }

        $path = $file->store('materials/sem'.$data['semester'], 'local');

        $material = new StudyMaterial($data);
        $material->forceFill([
            'file_path' => $path,
            'original_name' => mb_substr(basename($file->getClientOriginalName()), 0, 255),
            'mime_type' => $file->getMimeType() ?: 'application/octet-stream',
            'size_bytes' => $file->getSize(),
            'uploaded_by' => $request->user()->id,
        ])->save();

        $material->indexed_for_ai = $this->indexMaterial($material, $ext);
        $material->save();

        return response()->json(['data' => $this->presentMaterial($material->load('uploader:id,name'), $request->user())], 201);
    }

    public function downloadMaterial(Request $request, StudyMaterial $material): StreamedResponse
    {
        $scope = $request->user()->semesterScope();
        abort_if($scope !== null && $material->semester !== $scope, 404);
        abort_unless(Storage::disk('local')->exists($material->file_path), 404, 'The file is no longer available.');

        return Storage::disk('local')->download($material->file_path, $material->original_name);
    }

    public function destroyMaterial(Request $request, StudyMaterial $material): JsonResponse
    {
        $user = $request->user();
        abort_unless($user->hasRole(User::ROLE_PRINCIPAL) || $material->uploaded_by === $user->id, 403, 'Only the uploader or the principal can delete this material.');

        Storage::disk('local')->delete($material->file_path);
        $this->rag->removeSource('material', "Material #{$material->id}: {$material->title}");
        $material->delete();

        return response()->json(['ok' => true]);
    }

    // ── Notices ─────────────────────────────────────────────────────────────

    public function notices(Request $request): JsonResponse
    {
        $user = $request->user();
        $semester = $user->semesterScope();

        $notices = Notice::query()
            ->with('poster:id,name,role')
            ->when($semester !== null, fn ($q) => $q->forSemester($semester)->active())
            ->orderByRaw("FIELD(priority, 'urgent', 'important', 'normal')")
            ->latest()
            ->limit(100)
            ->get()
            ->map(fn (Notice $n) => [
                'id' => $n->id,
                'title' => $n->title,
                'body' => $n->body,
                'semester' => $n->semester,
                'subject_code' => $n->subject_code,
                'priority' => $n->priority,
                'expires_at' => $n->expires_at?->toIso8601String(),
                'created_at' => $n->created_at?->toIso8601String(),
                'posted_by' => $n->poster?->name,
                'poster_role' => $n->poster?->role,
                'can_delete' => $user->hasRole(User::ROLE_PRINCIPAL) || $n->posted_by === $user->id,
            ]);

        return response()->json(['data' => $notices]);
    }

    public function storeNotice(Request $request): JsonResponse
    {
        $data = $request->validate([
            'title' => ['required', 'string', 'min:3', 'max:255'],
            'body' => ['required', 'string', 'min:3', 'max:5000'],
            'semester' => ['nullable', 'integer', 'between:1,6'],
            'subject_code' => ['nullable', 'string', Rule::exists('courses', 'subject_code')],
            'priority' => ['required', Rule::in(Notice::PRIORITIES)],
            'expires_at' => ['nullable', 'date', 'after:now'],
        ]);

        $notice = new Notice($data);
        $notice->posted_by = $request->user()->id;
        $notice->save();

        try {
            $this->rag->indexNotice($notice);
        } catch (Throwable $e) {
            report($e);
        }

        return response()->json(['data' => $notice], 201);
    }

    public function destroyNotice(Request $request, Notice $notice): JsonResponse
    {
        $user = $request->user();
        abort_unless($user->hasRole(User::ROLE_PRINCIPAL) || $notice->posted_by === $user->id, 403, 'Only the author or the principal can delete this notice.');

        $this->rag->removeSource('notice', "Notice #{$notice->id}: {$notice->title}");
        $notice->delete();

        return response()->json(['ok' => true]);
    }

    // ── Helpers ─────────────────────────────────────────────────────────────

    /** Extracts text from PDF/TXT uploads into the AI knowledge base. */
    private function indexMaterial(StudyMaterial $material, string $ext): bool
    {
        try {
            $absolute = Storage::disk('local')->path($material->file_path);
            $text = match ($ext) {
                'pdf' => (new Parser())->parseFile($absolute)->getText(),
                'txt' => (string) file_get_contents($absolute),
                default => '',
            };
            // Scanned PDFs have (almost) no text layer; nothing useful to index.
            if (mb_strlen(trim($text)) < 50) {
                return false;
            }

            $header = "Study material \"{$material->title}\" (Semester {$material->semester}"
                .($material->subject_code ? ", {$material->subject_code}" : '').").\n";

            return $this->rag->indexMaterial($material, $header.$text) > 0;
        } catch (Throwable $e) {
            report($e);

            return false;
        }
    }

    private function presentMaterial(StudyMaterial $m, User $viewer): array
    {
        return [
            'id' => $m->id,
            'title' => $m->title,
            'description' => $m->description,
            'semester' => $m->semester,
            'subject_code' => $m->subject_code,
            'category' => $m->category,
            'original_name' => $m->original_name,
            'mime_type' => $m->mime_type,
            'size_bytes' => $m->size_bytes,
            'indexed_for_ai' => $m->indexed_for_ai,
            'uploaded_by' => $m->uploader?->name,
            'created_at' => $m->created_at?->toIso8601String(),
            'download_url' => "/api/materials/{$m->id}/download",
            'can_delete' => $viewer->hasRole(User::ROLE_PRINCIPAL) || $m->uploaded_by === $viewer->id,
        ];
    }
}
