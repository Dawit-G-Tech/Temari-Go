import React, { useEffect, useMemo, useState } from 'react';
import { Pressable, StyleSheet, TextInput, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { useAuth } from '@/src/hooks/useAuth';
import { useMe, useUpdateMe } from '@/src/hooks/useMe';
import { getMissingParentFields } from '@/src/utils/profileCompletion';
import { validateLanguagePreference, validatePhone } from '@/src/utils/validators';

export default function ProfileCompletionScreen() {
  const { logout } = useAuth();
  const meQuery = useMe();
  const updateMe = useUpdateMe();

  const me = meQuery.data;
  const [name, setName] = useState('');
  const [phone_number, setPhoneNumber] = useState('');
  const [language_preference, setLanguagePreference] = useState('');

  useEffect(() => {
    if (!me) return;
    setName((me.name as string) ?? '');
    setPhoneNumber((me.phone_number as string) ?? '');
    setLanguagePreference((me.language_preference as string) ?? '');
  }, [me]);

  const missing = useMemo(() => getMissingParentFields(me), [me]);
  const phoneError = useMemo(() => validatePhone(phone_number), [phone_number]);
  const langError = useMemo(() => validateLanguagePreference(language_preference), [language_preference]);
  const nameError = useMemo(() => (name.trim() ? null : 'Name is required.'), [name]);

  const canSave = !nameError && !phoneError && !langError && !updateMe.isPending;

  return (
    <ThemedView style={styles.container}>
      <ThemedText type="title">Complete your profile</ThemedText>
      <ThemedText>
        Required before you can continue: {missing.length ? missing.join(', ') : 'none'}
      </ThemedText>

      <View style={styles.field}>
        <ThemedText type="defaultSemiBold">Name *</ThemedText>
        <TextInput value={name} onChangeText={setName} placeholder="Full name" style={styles.input} />
        {nameError ? <ThemedText style={styles.errorText}>{nameError}</ThemedText> : null}
      </View>

      <View style={styles.field}>
        <ThemedText type="defaultSemiBold">Phone number *</ThemedText>
        <TextInput
          value={phone_number}
          onChangeText={setPhoneNumber}
          placeholder="+2519..."
          keyboardType="phone-pad"
          style={styles.input}
        />
        {phoneError ? <ThemedText style={styles.errorText}>{phoneError}</ThemedText> : null}
      </View>

      <View style={styles.field}>
        <ThemedText type="defaultSemiBold">Language preference *</ThemedText>
        <TextInput
          value={language_preference}
          onChangeText={setLanguagePreference}
          placeholder="e.g. en"
          autoCapitalize="none"
          style={styles.input}
        />
        {langError ? <ThemedText style={styles.errorText}>{langError}</ThemedText> : null}
      </View>

      {updateMe.error ? (
        <ThemedText style={styles.errorText}>{(updateMe.error as any)?.message ?? 'Update failed'}</ThemedText>
      ) : null}

      <Pressable
        disabled={!canSave}
        onPress={async () => {
          await updateMe.mutateAsync({
            name: name.trim(),
            phone_number: phone_number.trim(),
            language_preference: language_preference.trim(),
          });
        }}
        style={[styles.button, !canSave && styles.buttonDisabled]}>
        <ThemedText type="defaultSemiBold">{updateMe.isPending ? 'Saving…' : 'Save & continue'}</ThemedText>
      </Pressable>

      <Pressable onPress={() => void logout()} style={styles.linkButton}>
        <ThemedText type="link">Log out</ThemedText>
      </Pressable>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 16, gap: 14, justifyContent: 'center' },
  field: { gap: 8 },
  input: {
    borderWidth: 1,
    borderColor: '#C7CBD1',
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    backgroundColor: '#FFFFFF',
  },
  button: {
    marginTop: 8,
    paddingVertical: 12,
    borderRadius: 12,
    alignItems: 'center',
    backgroundColor: '#0a7ea4',
  },
  buttonDisabled: { opacity: 0.5 },
  linkButton: { alignItems: 'center', paddingVertical: 10 },
  errorText: { color: '#B42318' },
});

