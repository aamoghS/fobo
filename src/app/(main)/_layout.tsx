import { StyleSheet } from 'react-native';
import { TabList, TabSlot, TabTrigger, Tabs } from 'expo-router/ui';

import { TabBar, TabButton } from '@/components/TabBar';

export default function MainLayout() {
  return (
    <Tabs>
      <TabSlot style={styles.slot} />
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

// TabSlot won't shrink by default, so on web a tab grows to its content and scrolls the page.
// Holding it to the window keeps each screen's own ScrollView (and NavFade) in view.
const styles = StyleSheet.create({
  slot: { flexShrink: 1, minHeight: 0 },
});
