import type { Actions, ServerLoad, Action } from '@sveltejs/kit';
import db from '$lib/server/db.ts';
import { usersTable } from '$lib/server/schema.ts';
import { fail } from '@sveltejs/kit';
import { eq } from 'drizzle-orm';

export const load: ServerLoad = async () => {
  try {
    const users = await db.select().from(usersTable);
    return { users };
  } catch (error) {
    console.error('Failed to load users:', error);
    return { users: [] };
  }
};

export const actions: Actions = {
  create: (async ({ request }) => {  // ✅ Explicitly type as Action
    const data = await request.formData();
    const fullName = data.get('fullName')?.toString();
    const email = data.get('email')?.toString();
    const phoneNumber = data.get('phoneNumber')?.toString();
    const address = data.get('address')?.toString();

    if (!fullName || !email) {
      return fail(400, { 
        error: 'Full name and email are required',
        fullName,
        email,
        phoneNumber,
        address
      });
    }

    try {
      const [newUser] = await db.insert(usersTable).values({
        fullName,
        email,
        phoneNumber,
        address
      }).returning();

      return { success: true, user: newUser };
    } catch (error) {
      console.error('User creation failed:', error);
      return fail(500, { 
        error: 'Failed to create user',
        fullName,
        email,
        phoneNumber,
        address
      });
    }
  }) satisfies Action, // ✅ Ensures TypeScript knows this is a valid action

  update: (async ({ request }) => {
    const data = await request.formData();
    const id = data.get('id')?.toString();
    const fullName = data.get('fullName')?.toString();
    const email = data.get('email')?.toString();
    const phoneNumber = data.get('phoneNumber')?.toString();
    const address = data.get('address')?.toString();

    if (!id || !fullName || !email) {
      return fail(400, { 
        error: 'ID, full name, and email are required',
        fullName,
        email,
        phoneNumber,
        address
      });
    }

    try {
      const [updatedUser] = await db.update(usersTable)
        .set({ fullName, email, phoneNumber, address })
        .where(eq(usersTable.id, id))
        .returning();

      return { success: true, user: updatedUser };
    } catch (error) {
      console.error('User update failed:', error);
      return fail(500, { 
        error: 'Failed to update user',
        fullName,
        email,
        phoneNumber,
        address
      });
    }
  }) satisfies Action,

  delete: (async ({ request }) => {
    const data = await request.formData();
    const id = data.get('id')?.toString();

    if (!id) {
      return fail(400, { error: 'User ID is required' });
    }

    try {
      const [deletedUser] = await db.delete(usersTable)
        .where(eq(usersTable.id, id))
        .returning();

      return { success: true, user: deletedUser };
    } catch (error) {
      console.error('User deletion failed:', error);
      return fail(500, { error: 'Failed to delete user' });
    }
  }) satisfies Action
};
