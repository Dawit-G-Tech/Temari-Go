import type { UserMe } from '@/src/types/user';

export type MissingParentField = 'name' | 'phone_number' | 'language_preference';

function isBlank(v: unknown): boolean {
  return typeof v !== 'string' || v.trim().length === 0;
}

export function getMissingParentFields(me: UserMe | null | undefined): MissingParentField[] {
  if (!me) return ['name', 'phone_number', 'language_preference'];

  const missing: MissingParentField[] = [];
  if (isBlank(me.name)) missing.push('name');
  if (isBlank(me.phone_number)) missing.push('phone_number');
  if (isBlank(me.language_preference)) missing.push('language_preference');
  return missing;
}

export function isParentProfileComplete(me: UserMe | null | undefined): boolean {
  return getMissingParentFields(me).length === 0;
}

