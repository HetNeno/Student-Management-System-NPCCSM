<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;

/**
 * Seeds reference content only: the BCA curriculum and the project catalogue
 * that previously lived as constants in the React bundle.
 * No user accounts are seeded. Create the first principal with
 * `php artisan npccsm:create-user --role=principal`.
 */
class DatabaseSeeder extends Seeder
{
    public function run(): void
    {
        $this->call([
            CourseSeeder::class,
            ProjectCatalogSeeder::class,
        ]);
    }
}
