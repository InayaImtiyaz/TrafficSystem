import type { User } from '$lib/server/schema.ts';
  
export type PageData = {
  users: User[];
};

export type ActionData = {
  error?: string;
  fullName?: string;
  email?: string;
  phoneNumber?: string;
  address?: string;
  success?: boolean;
};