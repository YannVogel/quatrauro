import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';

import { CurrentCityProvider } from '@/lib/currentCity';
import { QueryProvider } from '@/lib/queryClient';
import { ThemePreferenceProvider } from '@/lib/themePreference';
import { useTheme } from '@/ui';

function Screens() {
  const theme = useTheme();
  return (
    <>
      <Stack
        screenOptions={{
          headerShown: false,
          contentStyle: { backgroundColor: theme.colors.background },
        }}
      />
      <StatusBar style={theme.name === 'dark' ? 'light' : 'dark'} />
    </>
  );
}

export default function RootLayout() {
  return (
    <QueryProvider>
      <CurrentCityProvider>
        <ThemePreferenceProvider>
          <Screens />
        </ThemePreferenceProvider>
      </CurrentCityProvider>
    </QueryProvider>
  );
}
