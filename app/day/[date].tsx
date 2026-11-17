import { useLocalSearchParams } from 'expo-router';

import { DayScreen } from '@/features/forecast';

export default function DayRoute() {
  const { date } = useLocalSearchParams<{ date?: string }>();
  return <DayScreen date={date} />;
}
