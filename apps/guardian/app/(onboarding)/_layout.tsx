import { Stack } from 'expo-router';

export default function OnboardingLayout() {
  return (
    <Stack>
      <Stack.Screen name="profile" options={{ title: 'Complete profile' }} />
    </Stack>
  );
}

