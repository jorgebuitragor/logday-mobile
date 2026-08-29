import { Tabs } from 'expo-router';

export default function TabsLayout() {
  return (
    <Tabs>
      <Tabs.Screen name="index" options={{ title: 'Tasks' }} />
      <Tabs.Screen name="notes" options={{ title: 'Notes' }} />
      <Tabs.Screen name="dailys" options={{ title: 'Dailys' }} />
      <Tabs.Screen name="overtime" options={{ title: 'Overtime' }} />
    </Tabs>
  );
}
