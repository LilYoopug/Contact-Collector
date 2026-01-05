<?php

namespace Database\Factories;

use App\Models\Contact;
use App\Models\User;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends \Illuminate\Database\Eloquent\Factories\Factory<\App\Models\Contact>
 */
class ContactFactory extends Factory
{
    /**
     * The name of the factory's corresponding model.
     *
     * @var string
     */
    protected $model = Contact::class;

    /**
     * Define the model's default state.
     *
     * @return array<string, mixed>
     */
    public function definition(): array
    {
        return [
            'user_id' => User::factory(),
            'full_name' => fake()->name(),
            'phone' => fake()->phoneNumber(),
            'email' => fake()->unique()->safeEmail(),
            'company' => fake()->company(),
            'job_title' => fake()->jobTitle(),
            'source' => fake()->randomElement(['ocr_list', 'form', 'import', 'manual']),
            'consent' => fake()->randomElement(['opt_in', 'opt_out', 'unknown']),
        ];
    }

    /**
     * Indicate that the contact was manually created.
     */
    public function manual(): static
    {
        return $this->state(fn (array $attributes) => [
            'source' => 'manual',
        ]);
    }

    /**
     * Indicate that the contact was imported via OCR.
     */
    public function ocr(): static
    {
        return $this->state(fn (array $attributes) => [
            'source' => 'ocr_list',
        ]);
    }

    /**
     * Indicate that the contact was imported from a file.
     */
    public function import(): static
    {
        return $this->state(fn (array $attributes) => [
            'source' => 'import',
        ]);
    }

    /**
     * Indicate that the contact was created via form.
     */
    public function form(): static
    {
        return $this->state(fn (array $attributes) => [
            'source' => 'form',
        ]);
    }

    /**
     * Indicate consent is granted (opt_in).
     */
    public function optIn(): static
    {
        return $this->state(fn (array $attributes) => [
            'consent' => 'opt_in',
        ]);
    }

    /**
     * Indicate consent is denied (opt_out).
     */
    public function optOut(): static
    {
        return $this->state(fn (array $attributes) => [
            'consent' => 'opt_out',
        ]);
    }
}
