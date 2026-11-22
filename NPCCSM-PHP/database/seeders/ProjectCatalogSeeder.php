<?php

namespace Database\Seeders;

use App\Models\Project;
use Illuminate\Database\Seeder;
use Illuminate\Support\Str;

/**
 * The six project briefs that were hard-coded in StudentProjects.jsx.
 * Idempotent: only creates a project if its slug does not exist yet, so
 * edits made later by teachers are never overwritten.
 */
class ProjectCatalogSeeder extends Seeder
{
    public function run(): void
    {
        $rows = json_decode(file_get_contents(__DIR__.'/data/projects.json'), true, flags: JSON_THROW_ON_ERROR);

        foreach ($rows as $row) {
            Project::firstOrCreate(
                ['slug' => Str::slug($row['title'])],
                [
                    'title' => $row['title'],
                    'description' => $row['description'],
                    'category' => $row['category'],
                    'difficulty' => $row['difficulty'],
                    'estimated_hours' => $row['hours'] ?? null,
                    'tech' => $row['tech'] ?? [],
                    'milestones' => $row['milestones'] ?? [],
                    'status' => 'published',
                ]
            );
        }
    }
}
