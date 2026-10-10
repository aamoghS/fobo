import { useRouter } from 'expo-router';
import type { ReactNode } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Button } from '@/components/Button';
import { Icon, type IconName } from '@/components/Icon';
import { IconButton } from '@/components/IconButton';
import { PaperSpirit } from '@/components/PaperSpirit';
import { Pressable } from '@/components/Pressable';
import { getPlan, planDetails } from '@/data/plans';
import { eventDateLine } from '@/lib/format';
import { color, radius } from '@/styles/tokens';
import { type } from '@/styles/type';
import { DAY_ROOM } from '../../../packages/core/src';

/** Event detail (368:9064). */
export function PlanDetail({ id }: { id: string }) {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const plan = getPlan(id);
  const detail = planDetails[id] ?? {};

  const close = () => (router.canGoBack() ? router.back() : router.replace('/plans'));

  if (!plan) {
    return (
      <View style={[styles.screen, { paddingTop: Math.max(insets.top, 40) }]}>
        <View style={styles.topBar}>
          <IconButton icon="close" label="Close" iconSize={20} onPress={close} />
        </View>
      </View>
    );
  }

  return (
    <View style={styles.screen}>
      <ScrollView contentContainerStyle={{ paddingTop: Math.max(insets.top, 40) }}>
        <View style={styles.topBar}>
          <IconButton icon="close" label="Close" iconSize={20} onPress={close} />
          <View style={styles.actions}>
            <Pressable accessibilityRole="button" accessibilityLabel="Edit plan" hitSlop={13} style={styles.action}>
              <Icon name="pencil" size={17} />
            </Pressable>
            <Pressable accessibilityRole="button" accessibilityLabel="More" hitSlop={12} style={styles.action}>
              <Icon name="more" size={20} />
            </Pressable>
          </View>
        </View>

        <View style={styles.header}>
          {/* Figma only has a header character for work (Kind6). Other kinds need art. */}
          {plan.kind === 'work' && <PaperSpirit mood="work" />}
          <View style={styles.headerText}>
            <Text accessibilityRole="header" style={[type.display, styles.ink]}>
              {plan.title}
            </Text>
            <Text style={[type.sub, styles.muted, styles.when]}>{eventDateLine(plan.start, plan.end)}</Text>
          </View>
        </View>

        <View style={styles.rows}>
          <Row icon="clock" title={`Costs ${plan.energyCost} of ${DAY_ROOM}`} detail={detail.costNote} />
          {detail.exit && (
            <Row
              icon="scissors"
              title={`Leave by ${detail.exit.leaveBy}`}
              detail={detail.exit.note}
              trailing={<Button label="Edit" variant="quiet" size="small" />}
            />
          )}
          {detail.reminder && <Row icon="bell" title={detail.reminder} />}
          {detail.people && <Row icon="people" title={detail.people.names} detail={detail.people.insight} />}
          <Row icon="arrow" title="Invite via link" last onPress={() => {}} />
        </View>
      </ScrollView>

      <View style={[styles.footer, { paddingBottom: Math.max(insets.bottom, 40) }]}>
        <Button label="Move it" variant="quiet" size="compact" style={styles.footerButton} />
        <Button label="Plan my exit" variant="ink" size="compact" style={styles.footerButton} />
      </View>
    </View>
  );
}

type RowProps = {
  icon: IconName;
  title: string;
  detail?: string;
  trailing?: ReactNode;
  last?: boolean;
  onPress?: () => void;
};

function Row({ icon, title, detail, trailing, last, onPress }: RowProps) {
  const body = (
    <>
      <View style={styles.rowIcon}>
        <Icon name={icon} size={20} color={color.ink2} />
      </View>
      <View style={styles.rowText}>
        <Text style={[type.bodyStrong, styles.ink]}>{title}</Text>
        {detail && <Text style={[type.sub, styles.muted, styles.rowDetail]}>{detail}</Text>}
      </View>
      {trailing}
    </>
  );
  const style = [styles.row, !last && styles.rowRule];
  return onPress ? (
    <Pressable accessibilityRole="button" onPress={onPress} style={style}>
      {body}
    </Pressable>
  ) : (
    <View style={style}>{body}</View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: color.groundAlt },
  ink: { color: color.ink },
  muted: { color: color.ink2 },
  topBar: {
    paddingHorizontal: 16,
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
  },
  actions: {
    height: 44,
    paddingHorizontal: 20,
    gap: 24,
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: radius.full,
    backgroundColor: color.fill,
  },
  action: { alignItems: 'center', justifyContent: 'center' },
  header: {
    paddingTop: 12,
    paddingHorizontal: 16,
    gap: 9,
    flexDirection: 'row',
    alignItems: 'center',
  },
  headerText: { flex: 1 },
  when: { paddingTop: 4 },
  rows: { paddingHorizontal: 16 },
  row: { paddingVertical: 16, gap: 20, flexDirection: 'row', alignItems: 'flex-start' },
  rowRule: { borderBottomWidth: 1, borderBottomColor: color.rule },
  rowIcon: { width: 34, paddingTop: 2, alignItems: 'center' },
  rowText: { flex: 1 },
  rowDetail: { paddingTop: 2 },
  footer: { paddingTop: 12, paddingHorizontal: 16, gap: 10, flexDirection: 'row' },
  footerButton: { flex: 1 },
});
