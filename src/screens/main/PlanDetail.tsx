import { useRouter } from 'expo-router';
import type { ReactNode } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Button } from '@/components/Button';
import { Icon, type IconName } from '@/components/Icon';
import { IconButton } from '@/components/IconButton';
import { MiniScrap } from '@/components/MiniScrap';
import { PaperSpirit } from '@/components/PaperSpirit';
import { Pressable } from '@/components/Pressable';
import { useLiveScreen } from '@/data/live';
import { getPlan, planDetails } from '@/data/plans';
import { eventDateLine } from '@/lib/format';
import { color, space } from '@/styles/tokens';
import { type } from '@/styles/type';
import { DAY_ROOM } from '../../../packages/core/src';

/** Event detail (368:9064). */
export function PlanDetail({ id }: { id: string }) {
  useLiveScreen();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const plan = getPlan(id);
  const detail = planDetails[id] ?? {};

  const close = () => (router.canGoBack() ? router.back() : router.replace('/plans'));

  if (!plan) {
    return (
      <View style={[styles.screen, { paddingTop: Math.max(insets.top, space[48]) }]}>
        <View style={styles.topBar}>
          <IconButton icon="close" label="Close" onPress={close} />
        </View>
      </View>
    );
  }

  return (
    <View style={styles.screen}>
      <ScrollView contentContainerStyle={{ paddingTop: Math.max(insets.top, space[48]) }}>
        <View style={styles.topBar}>
          <IconButton icon="close" label="Close" onPress={close} />
          <View style={styles.actions}>
            <IconButton icon="pencil" label="Edit plan" />
            <IconButton icon="more" label="More" />
          </View>
        </View>

        <View style={styles.header}>
          {/* Figma draws a header character for work (Kind6); other kinds wear their own scrap. */}
          {plan.kind === 'work' ? <PaperSpirit mood="work" /> : <View style={styles.spirit}><MiniScrap kind={plan.kind} id={plan.id} size={60} /></View>}
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
        <Button label="Move it" variant="quiet" style={styles.footerButton} />
        <Button label="Plan my exit" variant="ink" style={styles.footerButton} />
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
  screen: { flex: 1, backgroundColor: color.ground },
  ink: { color: color.ink },
  muted: { color: color.ink2 },
  topBar: {
    paddingHorizontal: space.margin,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  actions: { gap: space[8], flexDirection: 'row' },
  header: {
    paddingTop: space[16],
    paddingHorizontal: space.margin,
    gap: space[12],
    flexDirection: 'row',
    alignItems: 'center',
  },
  headerText: { flex: 1 },
  spirit: { width: 72, alignItems: 'center' },
  when: { paddingTop: space[4] },
  rows: { paddingTop: space[8], paddingHorizontal: space.margin },
  row: { paddingVertical: space[16], gap: space[16], flexDirection: 'row', alignItems: 'flex-start' },
  rowRule: { borderBottomWidth: 1, borderBottomColor: color.rule },
  rowIcon: { width: 24, paddingTop: 2, alignItems: 'center' },
  rowText: { flex: 1 },
  rowDetail: { paddingTop: space[4] },
  footer: { paddingTop: space[12], paddingHorizontal: space.margin, gap: space[12], flexDirection: 'row' },
  footerButton: { flex: 1 },
});
