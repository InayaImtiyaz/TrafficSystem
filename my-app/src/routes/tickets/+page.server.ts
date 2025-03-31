// src/routes/tickets/+page.server.ts
import type { Actions, ServerLoad, Action } from '@sveltejs/kit';
import db from '$lib/server/db.ts';
import { trafficTicketsTable, usersTable } from '$lib/server/schema.ts';
import { fail } from '@sveltejs/kit';
import { eq, like, desc, asc } from 'drizzle-orm';

// Load tickets with user information, including search and sort functionality
export const load: ServerLoad = async ({ url }) => {
  try {
    // Get search and sort parameters from URL
    const searchQuery = url.searchParams.get('search') || '';
    const sortBy = url.searchParams.get('sortBy') || 'dateIssued';
    const sortOrder = url.searchParams.get('sortOrder') || 'desc';
    const statusFilter = url.searchParams.get('status') || '';

    // Start building the query
    let query = db.select({
      id: trafficTicketsTable.id,
      userId: trafficTicketsTable.userId,
      userName: usersTable.fullName,
      licensePlate: trafficTicketsTable.licensePlate,
      violationType: trafficTicketsTable.violationType,
      fineAmount: trafficTicketsTable.fineAmount,
      dateIssued: trafficTicketsTable.dateIssued,
      status: trafficTicketsTable.status
    }).from(trafficTicketsTable)
      .leftJoin(usersTable, eq(trafficTicketsTable.userId, usersTable.id));

    // Apply search if provided
    if (searchQuery) {
      query = query.where(
        like(trafficTicketsTable.licensePlate, `%${searchQuery}%`)
      );
    }
    
    // Apply status filter if provided
    if (statusFilter) {
      query = query.where(eq(trafficTicketsTable.status, statusFilter));
    }

    // Apply sorting
    if (sortBy === 'dateIssued') {
      query = sortOrder === 'desc' 
        ? query.orderBy(desc(trafficTicketsTable.dateIssued))
        : query.orderBy(asc(trafficTicketsTable.dateIssued));
    } else if (sortBy === 'fineAmount') {
      query = sortOrder === 'desc'
        ? query.orderBy(desc(trafficTicketsTable.fineAmount))
        : query.orderBy(asc(trafficTicketsTable.fineAmount));
    }

    const tickets = await query;
    const users = await db.select().from(usersTable);

    return { 
      tickets, 
      users, 
      searchParams: {
        search: searchQuery,
        sortBy,
        sortOrder,
        status: statusFilter
      }
    };
  } catch (error) {
    console.error('Failed to load tickets:', error);
    return { 
      tickets: [], 
      users: [], 
      searchParams: {
        search: '',
        sortBy: 'dateIssued',
        sortOrder: 'desc',
        status: ''
      }
    };
  }
};

// Handle form actions for traffic tickets
export const actions: Actions = {
  // Create a new traffic ticket
  create: (async ({ request }) => {
    const data = await request.formData();
    const userId = data.get('userId')?.toString();
    const licensePlate = data.get('licensePlate')?.toString();
    const violationType = data.get('violationType')?.toString();
    const fineAmount = Number(data.get('fineAmount'));
    const status = data.get('status')?.toString() || 'unpaid';

    if (status !== 'unpaid' && status !== 'paid') {
      return fail(400, { error: 'Invalid status value. Allowed values are "unpaid" or "paid".' });
    }

    // Validation
    if (!userId || !licensePlate || !violationType || isNaN(fineAmount)) {
      return fail(400, { 
        error: 'Invalid ticket information',
        userId,
        licensePlate,
        violationType,
        fineAmount: fineAmount.toString(),
        status
      });
    }

    try {
      const [newTicket] = await db.insert(trafficTicketsTable).values({
        userId,
        licensePlate,
        violationType,
        fineAmount,
        status
      }).returning();

      return { success: true, ticket: newTicket };
    } catch (error) {
      console.error('Ticket creation failed:', error);
      return fail(500, { 
        error: 'Failed to create ticket',
        userId,
        licensePlate,
        violationType,
        fineAmount: fineAmount.toString(),
        status
      });
    }
  }) satisfies Action,

  // Update ticket status
  updateStatus: (async ({ request }) => {
    const data = await request.formData();
    const id = Number(data.get('id'));
    const status = data.get('status')?.toString();

    if (!id || !status) {
      return fail(400, { error: 'Ticket ID and status are required' });
    }

    if (status !== 'unpaid' && status !== 'paid') {
      return fail(400, { error: 'Invalid status value. Allowed values are "unpaid" or "paid".' });
    }

    try {
      const [updatedTicket] = await db.update(trafficTicketsTable)
        .set({ status })
        .where(eq(trafficTicketsTable.id, id))
        .returning();

      return { success: true, ticket: updatedTicket };
    } catch (error) {
      console.error('Ticket update failed:', error);
      return fail(500, { error: 'Failed to update ticket status' });
    }
  }) satisfies Action,

  // Update ticket details
  update: (async ({ request }) => {
    const data = await request.formData();
    const id = Number(data.get('id'));
    const userId = data.get('userId')?.toString();
    const licensePlate = data.get('licensePlate')?.toString();
    const violationType = data.get('violationType')?.toString();
    const fineAmount = data.get('fineAmount') ? Number(data.get('fineAmount')) : undefined;
    const status = data.get('status')?.toString();

    if (!id) {
      return fail(400, { error: 'Ticket ID is required' });
    }

    // Validate the data that's provided
    if (fineAmount !== undefined && isNaN(fineAmount)) {
      return fail(400, { error: 'Fine amount must be a number' });
    }

    if (status && status !== 'unpaid' && status !== 'paid') {
      return fail(400, { error: 'Invalid status value. Allowed values are "unpaid" or "paid".' });
    }

    // Build update object with only the fields that were provided
    const updateData: Partial<typeof trafficTicketsTable.$inferInsert> = {};
    
    if (userId) updateData.userId = userId;
    if (licensePlate) updateData.licensePlate = licensePlate;
    if (violationType) updateData.violationType = violationType;
    if (fineAmount !== undefined) updateData.fineAmount = fineAmount;
    if (status) updateData.status = status;

    // Don't update if no fields were provided
    if (Object.keys(updateData).length === 0) {
      return fail(400, { error: 'No valid fields provided for update' });
    }

    try {
      const [updatedTicket] = await db.update(trafficTicketsTable)
        .set(updateData)
        .where(eq(trafficTicketsTable.id, id))
        .returning();

      return { success: true, ticket: updatedTicket };
    } catch (error) {
      console.error('Ticket update failed:', error);
      return fail(500, { error: 'Failed to update ticket details' });
    }
  }) satisfies Action,

  // Delete a ticket
  delete: (async ({ request }) => {
    const data = await request.formData();
    const id = Number(data.get('id'));

    if (!id) {
      return fail(400, { error: 'Ticket ID is required' });
    }

    try {
      const [deletedTicket] = await db.delete(trafficTicketsTable)
        .where(eq(trafficTicketsTable.id, id))
        .returning();

      return { success: true, ticket: deletedTicket };
    } catch (error) {
      console.error('Ticket deletion failed:', error);
      return fail(500, { error: 'Failed to delete ticket' });
    }
  }) satisfies Action
};