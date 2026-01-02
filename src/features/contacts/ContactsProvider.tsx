// src/features/contacts/ContactsProvider.tsx
import React, {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import { readJson, writeJson } from "@/src/lib/storage";
import { createId } from "@/src/lib/ids";
import type { Contact, CreateContactInput } from "./types";

type ContactsContextValue = {
  contacts: Contact[];
  isLoaded: boolean;
  addContact(input: CreateContactInput): Promise<Contact>;
  removeContact(contactId: string): Promise<void>;
  updateContact(
    contactId: string,
    patch: Partial<CreateContactInput>
  ): Promise<void>;
  getContact(contactId: string): Contact | undefined;
};

const ContactsContext = createContext<ContactsContextValue | null>(null);

const STORAGE_KEY = "safesteps.contacts.v1";

function normalizePhone(phone?: string) {
  if (!phone) return undefined;
  const trimmed = phone.trim();
  return trimmed.length ? trimmed : undefined;
}

function normalizeEmail(email?: string) {
  if (!email) return undefined;
  const trimmed = email.trim().toLowerCase();
  return trimmed.length ? trimmed : undefined;
}

export function ContactsProvider({ children }: { children: React.ReactNode }) {
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [isLoaded, setIsLoaded] = useState(false);

  useEffect(() => {
    (async () => {
      const saved = await readJson<Contact[]>(STORAGE_KEY, []);
      setContacts(Array.isArray(saved) ? saved : []);
      setIsLoaded(true);
    })();
  }, []);

  useEffect(() => {
    if (!isLoaded) return;
    writeJson(STORAGE_KEY, contacts).catch(() => {});
  }, [contacts, isLoaded]);

  const value = useMemo<ContactsContextValue>(() => {
    return {
      contacts,
      isLoaded,
      async addContact(input) {
        const name = input.name.trim();
        if (!name) throw new Error("Name is required.");

        const next: Contact = {
          id: createId("ct"),
          name,
          phone: normalizePhone(input.phone),
          email: normalizeEmail(input.email),
          createdAt: new Date().toISOString(),
        };

        setContacts((prev) => [next, ...prev]);
        return next;
      },
      async removeContact(contactId) {
        setContacts((prev) => prev.filter((c) => c.id !== contactId));
      },
      async updateContact(contactId, patch) {
        setContacts((prev) =>
          prev.map((c) =>
            c.id === contactId
              ? {
                  ...c,
                  name: patch.name ? patch.name.trim() : c.name,
                  phone:
                    patch.phone !== undefined
                      ? normalizePhone(patch.phone)
                      : c.phone,
                  email:
                    patch.email !== undefined
                      ? normalizeEmail(patch.email)
                      : c.email,
                }
              : c
          )
        );
      },
      getContact(contactId) {
        return contacts.find((c) => c.id === contactId);
      },
    };
  }, [contacts, isLoaded]);

  return (
    <ContactsContext.Provider value={value}>{children}</ContactsContext.Provider>
  );
}

export function useContacts() {
  const ctx = useContext(ContactsContext);
  if (!ctx) throw new Error("useContacts must be used within a ContactsProvider");
  return ctx;
}
