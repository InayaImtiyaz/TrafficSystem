<script lang="ts">
  import { enhance } from '$app/forms';
  import type { PageData } from './$types';
  import { goto } from '$app/navigation';
  import { page } from '$app/stores';

  export let data: PageData;
  export let form;

  let showCreateForm = false;
  let selectedTicket: { id: number, status: string } | null = null;
  let editingTicket: any = null;
  let showPaymentModal = false;
  let payingTicket: any = null;
  let showSendEmailModal = false;
  let emailTicket: any = null;
  let emailMessage = '';
  
  // Search and sort parameters
  let searchQuery = data.searchParams?.search || '';
  let sortBy = data.searchParams?.sortBy || 'dateIssued';
  let sortOrder = data.searchParams?.sortOrder || 'desc';
  let statusFilter = data.searchParams?.status || '';

  function toggleCreateForm() {
    showCreateForm = !showCreateForm;
  }

  function prepareForStatusUpdate(ticket) {
    selectedTicket = {
      id: ticket.id,
      status: ticket.status === 'paid' ? 'unpaid' : 'paid'
    };
  }

  function resetSelection() {
    selectedTicket = null;
    editingTicket = null;
    payingTicket = null;
    showPaymentModal = false;
    showSendEmailModal = false;
    emailTicket = null;
  }

  function prepareForEdit(ticket) {
    editingTicket = { ...ticket };
  }

  function prepareForPayment(ticket) {
    payingTicket = { ...ticket };
    showPaymentModal = true;
  }

  function prepareForEmailNotification(ticket) {
    emailTicket = { ...ticket };
    showSendEmailModal = true;
    emailMessage = `Dear Driver,\n\nThis is a reminder that you have an unpaid traffic ticket (Ticket #${ticket.id}) for ${ticket.violationType} in the amount of $${ticket.fineAmount.toFixed(2)}.\n\nPlease make payment as soon as possible to avoid additional fees.\n\nThank you,\nTraffic Department`;
  }

  // Apply search and sort filters
  function applyFilters() {
    const params = new URLSearchParams();
    
    if (searchQuery) {
      params.set('search', searchQuery);
    }
    
    if (sortBy) {
      params.set('sortBy', sortBy);
    }
    
    if (sortOrder) {
      params.set('sortOrder', sortOrder);
    }
    
    if (statusFilter) {
      params.set('status', statusFilter);
    }
    
    goto(`?${params.toString()}`);
  }

  // Reset all filters
  function resetFilters() {
    searchQuery = '';
    sortBy = 'dateIssued';
    sortOrder = 'desc';
    statusFilter = '';
    goto('?');
  }

  // Toggle sort order
  function toggleSort(field: string) {
    if (sortBy === field) {
      sortOrder = sortOrder === 'asc' ? 'desc' : 'asc';
    } else {
      sortBy = field;
      sortOrder = 'desc';
    }
    applyFilters();
  }

  // Generate PDF invoice
  function generatePDF(ticket) {
    fetch(`/api/generate-invoice?id=${ticket.id}`, {
      method: 'GET',
    })
    .then(response => {
      if (response.ok) {
        return response.blob();
      }
      throw new Error('Failed to generate PDF');
    })
    .then(blob => {
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.style.display = 'none';
      a.href = url;
      a.download = `invoice_${ticket.id}.pdf`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
    })
    .catch(error => {
      console.error('Error generating PDF:', error);
      alert('Failed to generate PDF invoice');
    });
  }
</script>

<div class="container mx-auto p-4">
  <h1 class="text-2xl font-bold mb-6">Traffic Tickets Management</h1>

  {#if form?.error}
    <div class="bg-red-100 border border-red-400 text-red-700 px-4 py-3 mb-4 rounded">
      <p>{form.error}</p>
    </div>
  {/if}

  {#if form?.success}
    <div class="bg-green-100 border border-green-400 text-green-700 px-4 py-3 mb-4 rounded">
      <p>{form.message || 'Operation completed successfully!'}</p>
    </div>
  {/if}

  <div class="flex justify-between mb-6">
    <button 
      on:click={toggleCreateForm} 
      class="bg-blue-500 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded"
    >
      {showCreateForm ? 'Hide Form' : 'Create New Ticket'}
    </button>

    <button 
      on:click={() => goto('/payment-reports')}
      class="bg-purple-500 hover:bg-purple-700 text-white font-bold py-2 px-4 rounded"
    >
      View Payment Reports
    </button>
  </div>

  {#if showCreateForm}
    <div class="bg-gray-100 p-4 mb-6 rounded">
      <h2 class="text-xl font-semibold mb-4">Create New Traffic Ticket</h2>
      <form method="POST" action="?/create" use:enhance>
        <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div class="mb-4">
            <label for="userId" class="block text-gray-700 font-bold mb-2">User</label>
            <select id="userId" name="userId" class="w-full p-2 border rounded" required>
              <option value="">Select User</option>
              {#each data.users as user}
                <option value={user.id}>{user.fullName}</option>
              {/each}
            </select>
          </div>

          <div class="mb-4">
            <label for="licensePlate" class="block text-gray-700 font-bold mb-2">License Plate</label>
            <input 
              type="text" 
              id="licensePlate" 
              name="licensePlate" 
              class="w-full p-2 border rounded" 
              required
              value={form?.licensePlate || ''}
            />
          </div>

          <div class="mb-4">
            <label for="violationType" class="block text-gray-700 font-bold mb-2">Violation Type</label>
            <select id="violationType" name="violationType" class="w-full p-2 border rounded" required>
              <option value="">Select Type</option>
              <option value="Speeding">Speeding</option>
              <option value="Parking">Parking</option>
              <option value="Red Light">Red Light</option>
              <option value="No Insurance">No Insurance</option>
              <option value="Other">Other</option>
            </select>
          </div>

          <div class="mb-4">
            <label for="fineAmount" class="block text-gray-700 font-bold mb-2">Fine Amount ($)</label>
            <input 
              type="number" 
              id="fineAmount" 
              name="fineAmount" 
              min="0" 
              step="0.01" 
              class="w-full p-2 border rounded" 
              required
              value={form?.fineAmount || ''}
            />
          </div>

          <div class="mb-4">
            <label for="status" class="block text-gray-700 font-bold mb-2">Status</label>
            <select id="status" name="status" class="w-full p-2 border rounded" required>
              <option value="unpaid" selected>Unpaid</option>
              <option value="paid">Paid</option>
            </select>
          </div>
        </div>

        <button 
          type="submit" 
          class="bg-green-500 hover:bg-green-700 text-white font-bold py-2 px-4 rounded"
        >
          Create Ticket
        </button>
      </form>
    </div>
  {/if}

  <!-- Search and Filter Section -->
  <div class="bg-gray-100 p-4 mb-6 rounded">
    <h2 class="text-xl font-semibold mb-4">Search & Filter</h2>
    <div class="grid grid-cols-1 md:grid-cols-4 gap-4">
      <div>
        <label for="searchQuery" class="block text-gray-700 font-bold mb-2">Search License Plate</label>
        <input 
          type="text" 
          id="searchQuery" 
          bind:value={searchQuery} 
          placeholder="Search license plate..." 
          class="w-full p-2 border rounded"
        />
      </div>
      
      <div>
        <label for="statusFilter" class="block text-gray-700 font-bold mb-2">Status Filter</label>
        <select id="statusFilter" bind:value={statusFilter} class="w-full p-2 border rounded">
          <option value="">All Statuses</option>
          <option value="paid">Paid</option>
          <option value="unpaid">Unpaid</option>
        </select>
      </div>
      
      <div>
        <label for="sortBy" class="block text-gray-700 font-bold mb-2">Sort By</label>
        <select id="sortBy" bind:value={sortBy} class="w-full p-2 border rounded">
          <option value="dateIssued">Date Issued</option>
          <option value="fineAmount">Fine Amount</option>
        </select>
      </div>
      
      <div>
        <label for="sortOrder" class="block text-gray-700 font-bold mb-2">Sort Order</label>
        <select id="sortOrder" bind:value={sortOrder} class="w-full p-2 border rounded">
          <option value="desc">Descending</option>
          <option value="asc">Ascending</option>
        </select>
      </div>
    </div>
    
    <div class="mt-4 flex gap-2">
      <button 
        on:click={applyFilters}
        class="bg-blue-500 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded"
      >
        Apply Filters
      </button>
      
      <button 
        on:click={resetFilters}
        class="bg-gray-500 hover:bg-gray-700 text-white font-bold py-2 px-4 rounded"
      >
        Reset Filters
      </button>
    </div>
  </div>

  <h2 class="text-xl font-semibold mb-4">Ticket List</h2>
  
  {#if data.tickets.length === 0}
    <p class="italic text-gray-500">No tickets found.</p>
  {:else}
    <div class="overflow-x-auto">
      <table class="min-w-full bg-white border">
        <thead>
          <tr>
            <th class="py-2 px-4 border">ID</th>
            <th class="py-2 px-4 border">User</th>
            <th class="py-2 px-4 border">License Plate</th>
            <th class="py-2 px-4 border">Violation</th>
            <th class="py-2 px-4 border cursor-pointer" on:click={() => toggleSort('fineAmount')}>
              Amount
              {#if sortBy === 'fineAmount'}
                <span>{sortOrder === 'asc' ? '↑' : '↓'}</span>
              {/if}
            </th>
            <th class="py-2 px-4 border cursor-pointer" on:click={() => toggleSort('dateIssued')}>
              Date Issued
              {#if sortBy === 'dateIssued'}
                <span>{sortOrder === 'asc' ? '↑' : '↓'}</span>
              {/if}
            </th>
            <th class="py-2 px-4 border">Status</th>
            <th class="py-2 px-4 border">Actions</th>
          </tr>
        </thead>
        <tbody>
          {#each data.tickets as ticket}
            <tr>
              <td class="py-2 px-4 border">{ticket.id}</td>
              <td class="py-2 px-4 border">{ticket.userName || 'Unknown'}</td>
              <td class="py-2 px-4 border">{ticket.licensePlate}</td>
              <td class="py-2 px-4 border">{ticket.violationType}</td>
              <td class="py-2 px-4 border">${ticket.fineAmount.toFixed(2)}</td>
              <td class="py-2 px-4 border">{new Date(ticket.dateIssued).toLocaleDateString()}</td>
              <td class="py-2 px-4 border">
                <span class={ticket.status === 'paid' ? 'text-green-600 font-semibold' : 'text-red-600 font-semibold'}>
                  {ticket.status}
                </span>
              </td>
              <td class="py-2 px-4 border">
                <div class="flex flex-wrap space-x-1 space-y-1">
                  <!-- First row of buttons -->
                  <div class="flex space-x-1">
                    <!-- Edit Button -->
                    <button 
                      on:click={() => prepareForEdit(ticket)}
                      class="bg-blue-500 hover:bg-blue-700 text-white text-sm py-1 px-2 rounded"
                    >
                      Edit
                    </button>
                    
                    <!-- Delete Form -->
                    <form method="POST" action="?/delete" use:enhance>
                      <input type="hidden" name="id" value={ticket.id} />
                      <button 
                        type="submit" 
                        class="bg-red-500 hover:bg-red-700 text-white text-sm py-1 px-2 rounded"
                        on:click={resetSelection}
                      >
                        Delete
                      </button>
                    </form>
                  </div>
                  
                  <!-- Second row of buttons -->
                  <div class="flex space-x-1 ml-1">
                    {#if ticket.status === 'unpaid'}
                      <!-- Pay with Stripe Button -->
                      <button 
                        on:click={() => prepareForPayment(ticket)}
                        class="bg-green-500 hover:bg-green-700 text-white text-sm py-1 px-2 rounded"
                      >
                        Pay
                      </button>
                      
                      <!-- Send Email Notification -->
                      <button 
                        on:click={() => prepareForEmailNotification(ticket)}
                        class="bg-yellow-500 hover:bg-yellow-700 text-white text-sm py-1 px-2 rounded"
                      >
                        Email
                      </button>
                    {/if}
                    
                    <!-- Generate Invoice PDF -->
                    <button 
                      on:click={() => generatePDF(ticket)}
                      class="bg-purple-500 hover:bg-purple-700 text-white text-sm py-1 px-2 rounded"
                    >
                      Invoice
                    </button>
                  </div>
                </div>
              </td>
            </tr>
          {/each}
        </tbody>
      </table>
    </div>
  {/if}

  <!-- Status Update Modal -->
  {#if selectedTicket}
    <div class="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div class="bg-white p-6 rounded-lg max-w-md w-full">
        <h3 class="text-lg font-bold mb-4">Update Ticket Status</h3>
        <p class="mb-4">Are you sure you want to change the status to <strong>{selectedTicket.status}</strong>?</p>
        
        <form method="POST" action="?/updateStatus" use:enhance>
          <input type="hidden" name="id" value={selectedTicket.id} />
          <input type="hidden" name="status" value={selectedTicket.status} />
          
          <div class="flex justify-end space-x-2">
            <button 
              type="button" 
              on:click={resetSelection}
              class="bg-gray-300 hover:bg-gray-400 text-black font-bold py-2 px-4 rounded"
            >
              Cancel
            </button>
            <button 
              type="submit" 
              class="bg-blue-500 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded"
            >
              Confirm
            </button>
          </div>
        </form>
      </div>
    </div>
  {/if}
  
  <!-- Edit Ticket Modal -->
  {#if editingTicket}
    <div class="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div class="bg-white p-6 rounded-lg max-w-3xl w-full">
        <h3 class="text-lg font-bold mb-4">Edit Ticket Details</h3>
        
        <form method="POST" action="?/update" use:enhance>
          <input type="hidden" name="id" value={editingTicket.id} />
          
          <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div class="mb-4">
              <label for="editUserId" class="block text-gray-700 font-bold mb-2">User</label>
              <select id="editUserId" name="userId" class="w-full p-2 border rounded" required>
                {#each data.users as user}
                  <option value={user.id} selected={user.id === editingTicket.userId}>{user.fullName}</option>
                {/each}
              </select>
            </div>

            <div class="mb-4">
              <label for="editLicensePlate" class="block text-gray-700 font-bold mb-2">License Plate</label>
              <input 
                type="text" 
                id="editLicensePlate" 
                name="licensePlate" 
                class="w-full p-2 border rounded" 
                required
                bind:value={editingTicket.licensePlate}
              />
            </div>

            <div class="mb-4">
              <label for="editViolationType" class="block text-gray-700 font-bold mb-2">Violation Type</label>
              <select id="editViolationType" name="violationType" class="w-full p-2 border rounded" required bind:value={editingTicket.violationType}>
                <option value="Speeding">Speeding</option>
                <option value="Parking">Parking</option>
                <option value="Red Light">Red Light</option>
                <option value="No Insurance">No Insurance</option>
                <option value="Other">Other</option>
              </select>
            </div>

            <div class="mb-4">
              <label for="editFineAmount" class="block text-gray-700 font-bold mb-2">Fine Amount ($)</label>
              <input 
                type="number" 
                id="editFineAmount" 
                name="fineAmount" 
                min="0" 
                step="0.01" 
                class="w-full p-2 border rounded" 
                required
                bind:value={editingTicket.fineAmount}
              />
            </div>

            <div class="mb-4">
              <label for="editStatus" class="block text-gray-700 font-bold mb-2">Status</label>
              <select id="editStatus" name="status" class="w-full p-2 border rounded" required bind:value={editingTicket.status}>
                <option value="unpaid">Unpaid</option>
                <option value="paid">Paid</option>
              </select>
            </div>
          </div>
          
          <div class="flex justify-end space-x-2 mt-4">
            <button 
              type="button" 
              on:click={resetSelection}
              class="bg-gray-300 hover:bg-gray-400 text-black font-bold py-2 px-4 rounded"
            >
              Cancel
            </button>
            <button 
              type="submit" 
              class="bg-green-500 hover:bg-green-700 text-white font-bold py-2 px-4 rounded"
            >
              Save Changes
            </button>
          </div>
        </form>
      </div>
    </div>
  {/if}

  <!-- Stripe Payment Modal -->
  {#if showPaymentModal && payingTicket}
    <div class="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div class="bg-white p-6 rounded-lg max-w-md w-full">
        <h3 class="text-lg font-bold mb-4">Pay Traffic Ticket</h3>
        
        <div class="mb-4">
          <p><strong>Ticket ID:</strong> {payingTicket.id}</p>
          <p><strong>Violation:</strong> {payingTicket.violationType}</p>
          <p><strong>Amount:</strong> ${payingTicket.fineAmount.toFixed(2)}</p>
        </div>
        
        <form method="POST" action="?/createPaymentIntent" use:enhance>
          <input type="hidden" name="id" value={payingTicket.id} />
          <input type="hidden" name="amount" value={payingTicket.fineAmount} />
          
          <div class="mb-4">
            <label for="paymentEmail" class="block text-gray-700 font-bold mb-2">Email for Receipt</label>
            <input 
              type="email" 
              id="paymentEmail" 
              name="email" 
              class="w-full p-2 border rounded" 
              required
              placeholder="your@email.com"
            />
          </div>
          
          <div id="card-element" class="p-3 border rounded mb-4">
            <!-- Stripe.js will insert the card element here -->
            <p class="text-gray-500 italic">Card details form will appear here</p>
          </div>
          
          <div id="card-errors" class="text-red-600 mb-4"></div>
          
          <div class="flex justify-end space-x-2">
            <button 
              type="button" 
              on:click={resetSelection}
              class="bg-gray-300 hover:bg-gray-400 text-black font-bold py-2 px-4 rounded"
            >
              Cancel
            </button>
            <button 
              type="submit" 
              class="bg-green-500 hover:bg-green-700 text-white font-bold py-2 px-4 rounded"
            >
              Pay ${payingTicket.fineAmount.toFixed(2)}
            </button>
          </div>
        </form>
      </div>
    </div>
  {/if}

  <!-- Email Notification Modal -->
  {#if showSendEmailModal && emailTicket}
    <div class="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div class="bg-white p-6 rounded-lg max-w-md w-full">
        <h3 class="text-lg font-bold mb-4">Send Email Notification</h3>
        
        <form method="POST" action="?/sendEmail" use:enhance>
          <input type="hidden" name="id" value={emailTicket.id} />
          
          <div class="mb-4">
            <label for="recipientEmail" class="block text-gray-700 font-bold mb-2">Recipient Email</label>
            <input 
              type="email" 
              id="recipientEmail" 
              name="email" 
              class="w-full p-2 border rounded" 
              required
              placeholder="recipient@email.com"
            />
          </div>
          
          <div class="mb-4">
            <label for="emailSubject" class="block text-gray-700 font-bold mb-2">Subject</label>
            <input 
              type="text" 
              id="emailSubject" 
              name="subject" 
              class="w-full p-2 border rounded" 
              required
              value={`Unpaid Traffic Ticket #${emailTicket.id} - ${emailTicket.violationType}`}
            />
          </div>
          
          <div class="mb-4">
            <label for="emailMessage" class="block text-gray-700 font-bold mb-2">Message</label>
            <textarea 
              id="emailMessage" 
              name="message" 
              class="w-full p-2 border rounded h-32" 
              required
              bind:value={emailMessage}
            ></textarea>
          </div>
          
          <div class="mb-4">
            <label class="flex items-center">
              <input type="checkbox" name="attachInvoice" class="mr-2" checked>
              <span class="text-sm">Attach PDF Invoice</span>
            </label>
          </div>
          
          <div class="flex justify-end space-x-2">
            <button 
              type="button" 
              on:click={resetSelection}
              class="bg-gray-300 hover:bg-gray-400 text-black font-bold py-2 px-4 rounded"
            >
              Cancel
            </button>
            <button 
              type="submit" 
              class="bg-blue-500 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded"
            >
              Send Email
            </button>
          </div>
        </form>
      </div>
    </div>
  {/if}
</div>