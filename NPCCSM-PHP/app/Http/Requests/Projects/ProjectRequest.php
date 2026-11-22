<?php

namespace App\Http\Requests\Projects;

use App\Models\Project;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class ProjectRequest extends FormRequest
{
    public function authorize(): bool
    {
        return $this->user()?->hasRole('teacher', 'principal') ?? false;
    }

    public function rules(): array
    {
        $required = $this->isMethod('post') ? 'required' : 'sometimes';

        return [
            'title' => [$required, 'string', 'min:3', 'max:255'],
            'description' => [$required, 'string', 'min:10', 'max:5000'],
            'category' => [$required, 'string', 'max:50'],
            'difficulty' => [$required, Rule::in(Project::DIFFICULTIES)],
            'estimated_hours' => ['nullable', 'string', 'max:50'],
            'tech' => ['sometimes', 'array', 'max:20'],
            'tech.*' => ['string', 'max:50'],
            'milestones' => [$required, 'array', 'min:1', 'max:30'],
            'milestones.*' => ['string', 'min:3', 'max:500'],
            'semester' => ['nullable', 'integer', 'between:1,6'],
            'status' => ['sometimes', Rule::in(Project::STATUSES)],
        ];
    }
}
