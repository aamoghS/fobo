import { View } from 'react-native';

import ava from '@/assets/people/ava.svg';
import dani from '@/assets/people/dani.svg';
import hana from '@/assets/people/hana.svg';
import jun from '@/assets/people/jun.svg';
import lea from '@/assets/people/lea.svg';
import type { Person } from '@/data/people';
import { color, radius } from '@/styles/tokens';

// Avatar characters from Your circle (387:1456), 46x46.
const art = { ava, dani, hana, jun, lea };

/** The person's character art alone, for banners. */
export const personArt = (id: string) => art[id as keyof typeof art];

type Props = {
  person: Person;
  size?: number;
  /** Over 1 crops in on the character, like Jun's profile avatar. */
  zoom?: number;
};

/** A person's character on a tinted ring. 58 in lists; scales for the profile. */
export function Avatar({ person, size = 58, zoom = 1 }: Props) {
  const Art = personArt(person.id);
  const inner = ((size * 46) / 58) * zoom;
  return (
    <View
      importantForAccessibility="no-hide-descendants"
      style={{
        width: size,
        height: size,
        borderRadius: radius.full,
        backgroundColor: color[person.tint],
        alignItems: 'center',
        justifyContent: 'center',
        overflow: 'hidden',
      }}>
      {Art && <Art width={inner} height={inner} />}
    </View>
  );
}
