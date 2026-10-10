import { StyleSheet, Text, View } from 'react-native';

import { color, radius } from '@/styles/tokens';
import { type } from '@/styles/type';

import { Icon, type IconName } from './Icon';
import { Pressable } from './Pressable';

type Props = {
  icon: IconName;
  title: string;
  detail: string;
  /** Trailing black chip, e.g. "Rest". Without it the row shows a chevron. */
  action?: { label: string; onPress: () => void };
  onPress?: () => void;
};

/** Insight Row 34:1016: `.ins-row`. */
export function InsightRow({ icon, title, detail, action, onPress }: Props) {
  return (
    <Pressable accessibilityRole="button" onPress={onPress} style={styles.row}>
      <Icon name={icon} size={22} />
      <View style={styles.text}>
        <Text style={[type.bodyStrong, styles.title]} numberOfLines={1}>
          {title}
        </Text>
        <Text style={[type.sub, styles.detail]} numberOfLines={1}>
          {detail}
        </Text>
      </View>
      {action ? (
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={action.label}
          onPress={action.onPress}
          hitSlop={{ top: 4, bottom: 4 }}
          style={styles.action}>
          <Text style={[type.subStrong, styles.actionLabel]}>{action.label}</Text>
        </Pressable>
      ) : (
        <Icon name="chevron" color={color.ink2} />
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  row: {
    minHeight: 60,
    paddingLeft: 14,
    paddingRight: 12,
    paddingVertical: 10,
    gap: 12,
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: radius.row,
    backgroundColor: color.fill,
  },
  text: { flex: 1, gap: 1 },
  title: { color: color.ink },
  detail: { color: color.ink2 },
  action: {
    height: 36,
    paddingHorizontal: 14,
    justifyContent: 'center',
    borderRadius: radius.full,
    backgroundColor: color.selBg,
  },
  actionLabel: { color: color.selInk },
});
