<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\DB;

/** Idempotent: upserts by subject_code, never deletes. */
class CourseSeeder extends Seeder
{
    public function run(): void
    {
        $rows = json_decode(file_get_contents(__DIR__.'/data/courses.json'), true, flags: JSON_THROW_ON_ERROR);

        foreach ($rows as $row) {
            DB::table('courses')->updateOrInsert(
                ['subject_code' => $row['subject_code']],
                [
                    'title' => $row['title'],
                    'semester' => $row['semester'],
                    'type' => $row['type'],
                    'icon_class' => $row['icon_class'],
                    'units' => json_encode($row['units'], JSON_UNESCAPED_UNICODE),
                ]
            );
        }
    }
}
