// src/features/contacts/types.ts

export type Contact = {
  id: string;
  name: string;
  phone?: string;
  email?: string;
  createdAt: string;
};

export type CreateContactInput = {
  name: string;
  phone?: string;
  email?: string;
};
