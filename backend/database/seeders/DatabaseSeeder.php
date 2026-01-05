<?php

namespace Database\Seeders;

use App\Models\User;
use App\Models\Contact;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\Hash;

class DatabaseSeeder extends Seeder
{
    /**
     * Seed the application's database.
     */
    public function run(): void
    {
        // Create Admin User
        $admin = User::create([
            'name' => 'Admin User',
            'email' => 'admin@collector.com',
            'password' => Hash::make('password123'),
            'role' => 'admin',
            'phone' => '+628123456789',
            'last_login_at' => now(),
        ]);

        // Create Regular User
        $user = User::create([
            'name' => 'John Doe',
            'email' => 'john@example.com',
            'password' => Hash::make('password123'),
            'role' => 'user',
            'phone' => '+628987654321',
            'last_login_at' => now()->subDays(1),
        ]);

        // Create another Regular User
        $user2 = User::create([
            'name' => 'Jane Smith',
            'email' => 'jane@example.com',
            'password' => Hash::make('password123'),
            'role' => 'user',
            'phone' => '+628555555555',
            'last_login_at' => now()->subDays(3),
        ]);

        // Create sample contacts for John Doe
        $contacts = [
            [
                'full_name' => 'Budi Santoso',
                'phone' => '6281234567890',
                'email' => 'budi.santoso@example.com',
                'company' => 'PT Maju Mundur',
                'job_title' => 'Sales Manager',
                'source' => 'import',
                'consent' => 'opt_in',
            ],
            [
                'full_name' => 'Citra Lestari',
                'phone' => '6281298765432',
                'email' => 'citra.lestari@example.com',
                'company' => 'Warung Kopi Digital',
                'job_title' => 'Marketing Specialist',
                'source' => 'ocr_list',
                'consent' => 'unknown',
            ],
            [
                'full_name' => 'Ahmad Abdullah',
                'phone' => '6285512345678',
                'email' => 'ahmad.a@startup.id',
                'company' => 'Startup Indonesia',
                'job_title' => 'Founder',
                'source' => 'ocr_list',
                'consent' => 'unknown',
            ],
            [
                'full_name' => 'Siti Aminah',
                'phone' => '6281311223344',
                'email' => 'siti@gov.id',
                'company' => 'Departemen Kreatif',
                'job_title' => 'Public Relations',
                'source' => 'manual',
                'consent' => 'opt_in',
            ],
            [
                'full_name' => 'Michael Chen',
                'phone' => '16501112222',
                'email' => 'm.chen@silicon.io',
                'company' => 'NextGen AI',
                'job_title' => 'CTO',
                'source' => 'form',
                'consent' => 'opt_in',
            ],
            [
                'full_name' => 'Rina Wijaya',
                'phone' => '6281999888777',
                'email' => 'rina.w@creative.net',
                'company' => 'Studio 45',
                'job_title' => 'Art Director',
                'source' => 'ocr_list',
                'consent' => 'opt_out',
            ],
            [
                'full_name' => 'David Lee',
                'phone' => '447700111222',
                'email' => 'david@techuk.co',
                'company' => 'Tech UK Ltd',
                'job_title' => 'Lead Developer',
                'source' => 'manual',
                'consent' => 'opt_in',
            ],
            [
                'full_name' => 'Eko Prasetyo',
                'phone' => '6281255554444',
                'email' => 'eko.p@bank.id',
                'company' => 'Bank Central',
                'job_title' => 'Account Manager',
                'source' => 'import',
                'consent' => 'unknown',
            ],
            [
                'full_name' => 'Linda Hamilton',
                'phone' => '13105559988',
                'email' => 'linda@security.com',
                'company' => 'Security Corp',
                'job_title' => 'CEO',
                'source' => 'manual',
                'consent' => 'opt_in',
            ],
            [
                'full_name' => 'Agus Kurniawan',
                'phone' => '6282211223344',
                'email' => 'agus@media.com',
                'company' => 'Media Nusantara',
                'job_title' => 'Content Director',
                'source' => 'form',
                'consent' => 'opt_in',
            ],
        ];

        foreach ($contacts as $index => $contact) {
            Contact::create([
                'user_id' => $user->id,
                'full_name' => $contact['full_name'],
                'phone' => $contact['phone'],
                'email' => $contact['email'],
                'company' => $contact['company'],
                'job_title' => $contact['job_title'],
                'source' => $contact['source'],
                'consent' => $contact['consent'],
                'created_at' => now()->subDays($index),
            ]);
        }

        // Create a few contacts for Jane Smith
        $janeContacts = [
            [
                'full_name' => 'Robert Brown',
                'phone' => '12025550123',
                'email' => 'robert@consulting.com',
                'company' => 'Brown Consulting',
                'job_title' => 'Consultant',
                'source' => 'manual',
                'consent' => 'opt_in',
            ],
            [
                'full_name' => 'Maria Garcia',
                'phone' => '34612345678',
                'email' => 'maria@design.es',
                'company' => 'Design Studio Madrid',
                'job_title' => 'Senior Designer',
                'source' => 'form',
                'consent' => 'opt_in',
            ],
            [
                'full_name' => 'Tono Sudaryono',
                'phone' => '6281877665544',
                'email' => 'tono@logistic.id',
                'company' => 'Cepat Kilat',
                'job_title' => 'Operations Manager',
                'source' => 'import',
                'consent' => 'opt_out',
            ],
        ];

        foreach ($janeContacts as $index => $contact) {
            Contact::create([
                'user_id' => $user2->id,
                'full_name' => $contact['full_name'],
                'phone' => $contact['phone'],
                'email' => $contact['email'],
                'company' => $contact['company'],
                'job_title' => $contact['job_title'],
                'source' => $contact['source'],
                'consent' => $contact['consent'],
                'created_at' => now()->subDays($index + 2),
            ]);
        }

        $this->command->info('Database seeded successfully!');
        $this->command->info('');
        $this->command->info('Sample accounts created:');
        $this->command->info('┌────────────────────────────┬─────────────────────────┬──────────────┐');
        $this->command->info('│ Role                       │ Email                   │ Password     │');
        $this->command->info('├────────────────────────────┼─────────────────────────┼──────────────┤');
        $this->command->info('│ Admin                      │ admin@collector.com     │ password123  │');
        $this->command->info('│ User (10 contacts)         │ john@example.com        │ password123  │');
        $this->command->info('│ User (3 contacts)          │ jane@example.com        │ password123  │');
        $this->command->info('└────────────────────────────┴─────────────────────────┴──────────────┘');
    }
}
