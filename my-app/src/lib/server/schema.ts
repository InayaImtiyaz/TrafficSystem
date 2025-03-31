import { relations } from 'drizzle-orm';
import { pgTable, uuid, text, integer, timestamp, serial, pgEnum } from 'drizzle-orm/pg-core';

// Enum for ticket status
export const ticketStatusEnum = pgEnum('ticket_status', ['unpaid', 'paid']);

// Users table definition
export const usersTable = pgTable('users', {
  id: uuid('id').primaryKey().defaultRandom(),
  fullName: text('full_name').notNull(),
  email: text('email').unique().notNull(),
  phoneNumber: text('phone_number'),
  address: text('address')
});

// Traffic tickets table definition
export const trafficTicketsTable = pgTable('traffic_tickets', {
  id: serial('id').primaryKey(),
  userId: uuid('user_id').references(() => usersTable.id, { onDelete: 'cascade' }).notNull(),
  licensePlate: text('license_plate').notNull(),
  violationType: text('violation_type').notNull(),
  fineAmount: integer('fine_amount').notNull(),
  dateIssued: timestamp('date_issued').defaultNow().notNull(),
  status: ticketStatusEnum('status').default('unpaid')
});

// Define relations between tables
export const userRelations = relations(usersTable, ({ many }) => ({
  trafficTickets: many(trafficTicketsTable)
}));

export const trafficTicketRelations = relations(trafficTicketsTable, ({ one }) => ({
  user: one(usersTable, {
    fields: [trafficTicketsTable.userId],
    references: [usersTable.id]
  })
}));

// Types for TypeScript
export type User = typeof usersTable.$inferSelect;
export type NewUser = typeof usersTable.$inferInsert;
export type TrafficTicket = typeof trafficTicketsTable.$inferSelect;
export type NewTrafficTicket = typeof trafficTicketsTable.$inferInsert;