<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Requests\Contact\BatchDeleteContactRequest;
use App\Http\Requests\Contact\BatchStoreContactRequest;
use App\Http\Requests\Contact\BatchUpdateContactRequest;
use App\Http\Requests\Contact\StoreContactRequest;
use App\Http\Requests\Contact\UpdateContactRequest;
use App\Http\Resources\ContactResource;
use App\Models\Contact;
use App\Services\DuplicateDetectionService;
use Carbon\Carbon;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\AnonymousResourceCollection;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Validator;

class ContactController extends Controller
{
    /**
     * Display a listing of the user's contacts with optional search and filters.
     *
     * Search is case-insensitive and matches against: full_name, phone, email, company.
     * Supports pagination with 'per_page' and 'page' parameters.
     * Will support date filters (date_from, date_to) in Story 5.2.
     */
    public function index(Request $request): AnonymousResourceCollection
    {
        $userId = auth()->id();
        
        $query = Contact::where('user_id', $userId);
        
        // Search filter - case-insensitive across multiple columns (Story 5.1)
        if ($request->filled('search')) {
            $search = trim($request->input('search'));
            
            // Prevent wildcard-only searches and strip leading/trailing wildcards
            $search = preg_replace('/^[%_]+|[%_]+$/', '', $search);
            
            if (!empty($search)) {
                $searchTerm = '%' . strtolower($search) . '%';
                
                $query->where(function ($q) use ($searchTerm) {
                    $q->whereRaw('LOWER(full_name) LIKE ?', [$searchTerm])
                      ->orWhereRaw('LOWER(phone) LIKE ?', [$searchTerm])
                      ->orWhereRaw('LOWER(COALESCE(email, \'\')) LIKE ?', [$searchTerm])
                      ->orWhereRaw('LOWER(COALESCE(company, \'\')) LIKE ?', [$searchTerm]);
                });
            }
        }
        
        // Date filter: date_from (inclusive) - Story 5.2
        if ($request->filled('date_from')) {
            try {
                $dateFrom = Carbon::parse($request->input('date_from'))->startOfDay();
                $query->where('created_at', '>=', $dateFrom);
            } catch (\Exception $e) {
                // Invalid date format - silently ignore
            }
        }
        
        // Date filter: date_to (inclusive) - Story 5.2
        if ($request->filled('date_to')) {
            try {
                $dateTo = Carbon::parse($request->input('date_to'))->endOfDay();
                $query->where('created_at', '<=', $dateTo);
            } catch (\Exception $e) {
                // Invalid date format - silently ignore
            }
        }
        
        // Source filter - Story 7.9
        if ($request->filled('source') && $request->input('source') !== 'all') {
            $query->where('source', $request->input('source'));
        }
        
        // Default ordering by created_at DESC
        $query->orderBy('created_at', 'desc');
        
        // Paginate results with configurable per_page (default 25)
        $perPage = $request->input('per_page', 25);
        $contacts = $query->paginate($perPage);
        
        return ContactResource::collection($contacts);
    }

    /**
     * Display the specified contact.
     */
    public function show(string $id): ContactResource
    {
        $contact = Contact::where('user_id', auth()->id())
            ->findOrFail($id);

        return new ContactResource($contact);
    }

    /**
     * Store a newly created contact.
     * Story 8-10: Uses DuplicateDetectionService for duplicate checking.
     */
    public function store(StoreContactRequest $request, DuplicateDetectionService $duplicateService): \Illuminate\Http\JsonResponse
    {
        $userId = auth()->id();

        // Check for duplicates using the service
        $existing = $duplicateService->findDuplicate(
            $userId,
            $request->phone,
            $request->email
        );

        if ($existing) {
            return response()->json([
                'message' => 'Duplicate contact detected',
                'existing' => new ContactResource($existing),
            ], 409);
        }

        $contact = Contact::create([
            'user_id' => $userId,
            'full_name' => $request->full_name,
            'phone' => $request->phone,
            'email' => $request->email,
            'company' => $request->company,
            'job_title' => $request->job_title,
            'source' => $request->source ?? 'manual',
            'consent' => $request->consent ?? 'unknown',
        ]);

        return (new ContactResource($contact))->response()->setStatusCode(201);
    }

    /**
     * Update the specified contact.
     */
    public function update(UpdateContactRequest $request, string $id): ContactResource
    {
        // Find contact with ownership check
        $contact = Contact::where('user_id', auth()->id())
            ->findOrFail($id);

        // Update only provided fields
        $contact->update($request->only([
            'full_name',
            'phone',
            'email',
            'company',
            'job_title',
            'source',
            'consent',
        ]));

        return new ContactResource($contact->fresh());
    }

    /**
     * Remove the specified contact.
     */
    public function destroy(string $id): \Illuminate\Http\Response
    {
        // Find contact with ownership check
        $contact = Contact::where('user_id', auth()->id())
            ->findOrFail($id);

        $contact->delete();

        return response()->noContent(); // 204 No Content
    }

    /**
     * Remove multiple contacts at once.
     *
     * @param BatchDeleteContactRequest $request
     * @return \Illuminate\Http\Response
     */
    public function destroyBatch(BatchDeleteContactRequest $request): \Illuminate\Http\Response
    {
        $ids = $request->validated()['ids'];

        // Only delete contacts owned by the authenticated user
        // This silently ignores IDs that don't belong to the user
        Contact::where('user_id', auth()->id())
            ->whereIn('id', $ids)
            ->delete();

        return response()->noContent(); // 204 No Content
    }

    /**
     * Update multiple contacts at once.
     *
     * @param BatchUpdateContactRequest $request
     * @return \Illuminate\Http\Resources\Json\AnonymousResourceCollection
     */
    public function updateBatch(BatchUpdateContactRequest $request): AnonymousResourceCollection
    {
        $validated = $request->validated();
        $ids = $validated['ids'];
        $updates = $validated['updates'];

        // Map fields to database columns
        $dbUpdates = [];
        if (isset($updates['company'])) {
            $dbUpdates['company'] = $updates['company'];
        }
        if (isset($updates['job_title'])) {
            $dbUpdates['job_title'] = $updates['job_title'];
        }
        if (isset($updates['consent'])) {
            $dbUpdates['consent'] = $updates['consent'];
        }

        // Only update contacts owned by the authenticated user
        Contact::where('user_id', auth()->id())
            ->whereIn('id', $ids)
            ->update($dbUpdates);

        // Fetch and return the updated contacts
        $updatedContacts = Contact::where('user_id', auth()->id())
            ->whereIn('id', $ids)
            ->get();

        return ContactResource::collection($updatedContacts);
    }

    /**
     * Store multiple contacts at once with duplicate detection.
     *
     * @param BatchStoreContactRequest $request
     * @return \Illuminate\Http\JsonResponse
     */
    public function storeBatch(BatchStoreContactRequest $request): \Illuminate\Http\JsonResponse
    {
        $userId = auth()->id();
        $contacts = $request->validated()['contacts'];

        $created = [];
        $duplicates = [];
        $errors = [];

        // Collect all phones and emails for batch duplicate check
        $phones = collect($contacts)->pluck('phone')->filter()->unique()->toArray();
        $emails = collect($contacts)->pluck('email')->filter()->unique()->toArray();

        // Batch query for existing contacts (optimized with IN clause)
        $existingByPhone = Contact::where('user_id', $userId)
            ->whereIn('phone', $phones)
            ->get()
            ->keyBy('phone');

        $existingByEmail = Contact::where('user_id', $userId)
            ->whereIn('email', $emails)
            ->get()
            ->keyBy('email');

        // Track phones/emails within this batch to detect intra-batch duplicates
        $batchPhones = collect();
        $batchEmails = collect();

        DB::beginTransaction();

        try {
            foreach ($contacts as $contactData) {
                // Check for duplicates against existing contacts
                $existingContact = null;

                if (!empty($contactData['phone']) && $existingByPhone->has($contactData['phone'])) {
                    $existingContact = $existingByPhone->get($contactData['phone']);
                } elseif (!empty($contactData['email']) && $existingByEmail->has($contactData['email'])) {
                    $existingContact = $existingByEmail->get($contactData['email']);
                }

                // Check for duplicates within the same batch
                if (!$existingContact) {
                    if (!empty($contactData['phone']) && $batchPhones->contains($contactData['phone'])) {
                        // Find the already-created contact in this batch
                        $existingContact = Contact::where('user_id', $userId)
                            ->where('phone', $contactData['phone'])
                            ->first();
                    } elseif (!empty($contactData['email']) && $batchEmails->contains($contactData['email'])) {
                        $existingContact = Contact::where('user_id', $userId)
                            ->where('email', $contactData['email'])
                            ->first();
                    }
                }

                if ($existingContact) {
                    $duplicates[] = [
                        'input' => $contactData,
                        'existing' => new ContactResource($existingContact),
                    ];
                    continue;
                }

                // Validate individual contact for field-level validation
                $validator = Validator::make($contactData, [
                    'fullName' => 'required|string|max:255',
                    'phone' => 'required|string|max:255',
                    'email' => 'nullable|email|max:255',
                    'company' => 'nullable|string|max:255',
                    'jobTitle' => 'nullable|string|max:255',
                    'source' => 'nullable|in:ocr_list,form,import,manual',
                    'consent' => 'nullable|in:opt_in,opt_out,unknown',
                ]);

                if ($validator->fails()) {
                    $errors[] = [
                        'input' => $contactData,
                        'message' => $validator->errors()->first(),
                    ];
                    continue;
                }

                // Transform camelCase to snake_case for database
                $contact = Contact::create([
                    'user_id' => $userId,
                    'full_name' => $contactData['fullName'],
                    'phone' => $contactData['phone'],
                    'email' => $contactData['email'] ?? null,
                    'company' => $contactData['company'] ?? null,
                    'job_title' => $contactData['jobTitle'] ?? null,
                    'source' => $contactData['source'] ?? 'manual',
                    'consent' => $contactData['consent'] ?? 'unknown',
                ]);

                $created[] = new ContactResource($contact);

                // Track in batch collections for intra-batch duplicate detection
                if (!empty($contactData['phone'])) {
                    $batchPhones->push($contactData['phone']);
                    $existingByPhone->put($contactData['phone'], $contact);
                }
                if (!empty($contactData['email'])) {
                    $batchEmails->push($contactData['email']);
                    $existingByEmail->put($contactData['email'], $contact);
                }
            }

            DB::commit();

        } catch (\Exception $e) {
            DB::rollBack();

            return response()->json([
                'message' => 'Failed to create contacts',
                'error' => $e->getMessage(),
            ], 500);
        }

        return response()->json([
            'created' => $created,
            'duplicates' => $duplicates,
            'errors' => $errors,
        ], 201);
    }
}
