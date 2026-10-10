import { TabList, TabSlot, TabTrigger, Tabs } from 'expo-router/ui';

import { TabBar, TabButton } from '@/components/TabBar';

export default function MainLayout() {
  return (
    <Tabs>
      <TabSlot />
      <TabList asChild>
        <TabBar>
          <TabTrigger name="week" href="/week" asChild>
            <TabButton icon="week" label="Week" />
          </TabTrigger>
          <TabTrigger name="plans" href="/plans" asChild>
            <TabButton icon="plans" label="Plans" />
          </TabTrigger>
          <TabTrigger name="people" href="/people" resetOnFocus asChild>
            <TabButton icon="people" label="People" />
          </TabTrigger>
          <TabTrigger name="you" href="/you" resetOnFocus asChild>
            <TabButton icon="you" label="You" />
          </TabTrigger>
        </TabBar>
      </TabList>
    </Tabs>
  );
}
