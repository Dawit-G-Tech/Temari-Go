export function validatePhone(phone: string): string | null {
  const v = phone.trim();
  if (!v) return 'Phone number is required.';
  // Keep permissive: allow +, digits, spaces, dashes.
  if (!/^\+?[0-9][0-9 \-()]{6,}$/.test(v)) return 'Enter a valid phone number.';
  return null;
}

export function validateLanguagePreference(lang: string): string | null {
  const v = lang.trim();
  if (!v) return 'Language preference is required.';
  return null;
}

