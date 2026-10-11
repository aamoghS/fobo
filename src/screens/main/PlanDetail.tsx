import { useRouter } from 'expo-router';
import { useState, type ReactNode } from 'react';
import { Platform, ScrollView, Share, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Button } from '@/components/Button';
import { Icon, type IconName } from '@/components/Icon';
import { IconButton } from '@/components/IconButton';
import { MiniScrap } from '@/components/MiniScrap';
import { PaperSpirit } from '@/components/PaperSpirit';
import { Pressable } from '@/components/Pressable';
import { Sheet } from '@/components/Sheet';
import { loadLive, useLiveScreen } from '@/data/live';
import { getPlan, planDetails } from '@/data/plans';
import { send } from '@/lib/api';
import { eventDateLine } from '@/lib/format';
import { notify } from '@/lib/notify';
import { color, space } from '@/styles/tokens';
import { type } from '@/styles/type';
import { DAY_ROOM } from '../../../packages/core/src';

/** Event detail (368:9064). */
export function PlanDetail({ id }: { id: string }) {
  'use no memo'; // Reads the in-memory data, which changes without new props; see live.ts.
  useLiveScreen();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const plan = getPlan(id);
  const detail = planDetails[id] ?? {};
  // The More sheet: open, or deleting the plan.
  const [more, setMore] = useState<'open' | 'deleting' | null>(null);
  const [error, setError] = useState('');

  const close = () => (router.canGoBack() ? router.back() : router.replace('/plans'));
  const edit = () => router.push({ pathname: '/plans/new', params: { id } });

  // A link to a page with the plan's name and time, through the share sheet.
  const invite = async () => {
    const result = await send<{ url: string }>('POST', `/plans/${id}/invite`);
    if ('error' in result) return notify(result.error);
    const message = plan ? `${plan.title}, ${eventDateLine(plan.start, plan.end)}. ${result.data.url}` : result.data.url;
    try {
      await Share.share(Platform.OS === 'ios' ? { message: message.replace(` ${result.data.url}`, ''), url: result.data.url } : { message });
    } catch {
      notify(result.data.url);
    }
  };

  // Same as Delete plan on the edit form: a Google plan is declined, Fobo's own is removed.
  const remove = async () => {
    setMore('deleting');
    const result = await send('DELETE', `/plans/${id}`);
    if ('error' in result) {
      setMore('open');
      return setError(result.error);
    }
    await loadLive().catch(() => false);
    setMore(null);
    close();
  };

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
            <IconButton icon="pencil" label="Edit plan" onPress={() => edit()} />
            <IconButton
              icon="more"
              label="More"
              onPress={() => {
                setError('');
                setMore('open');
              }}
            />
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
              trailing={<Button label="Edit" variant="quiet" size="small" onPress={() => router.push({ pathname: '/exit/[id]', params: { id: plan.id } })} />}
            />
          )}
          {plan.notes && <Row icon="file" title="Details" detail={plan.notes} />}
          {detail.reminder && <Row icon="bell" title={detail.reminder} />}
          {detail.people && <Row icon="people" title={detail.people.names} detail={detail.people.insight} />}
          <Row icon="arrow" title="Invite via link" last onPress={invite} />
        </View>
      </ScrollView>

      <View style={[styles.footer, { paddingBottom: Math.max(insets.bottom, 40) }]}>
        <Button label="Move it" variant="quiet" style={styles.footerButton} onPress={() => router.push({ pathname: '/move/[id]', params: { id: plan.id } })} />
        <Button label="Plan my exit" variant="ink" style={styles.footerButton} onPress={() => router.push({ pathname: '/exit/[id]', params: { id: plan.id } })} />
      </View>

      <Sheet visible={!!more} onClose={() => more !== 'deleting' && setMore(null)} title={plan.title}>
        <View style={styles.sheet}>
          {error ? <Text style={[type.sub, styles.error]}>{error}</Text> : null}
          <Button label={more === 'deleting' ? 'Deleting' : 'Delete plan'} disabled={more === 'deleting'} onPress={remove} />
        </View>
      </Sheet>
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
  sheet: { gap: space[20] },
  error: { color: color.error },
});
