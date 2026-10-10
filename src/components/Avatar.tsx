import { View } from 'react-native';

import ava from '@/assets/people/ava.svg';
import dani from '@/assets/people/dani.svg';
import hana from '@/assets/people/hana.svg';
import jun from '@/assets/people/jun.svg';
import lea from '@/assets/people/lea.svg';
import avaEyes from '@/assets/people/ava-eyes.svg';
import daniEyes from '@/assets/people/dani-eyes.svg';
import hanaEyes from '@/assets/people/hana-eyes.svg';
import leaEyes from '@/assets/people/lea-eyes.svg';
import type { Person } from '@/data/people';
import { color, radius } from '@/styles/tokens';

// Avatar characters from Your circle (387:1456), 46x46.
const art = { ava, dani, hana, jun, lea };

// Profile avatars are the character's own paper colour with just its eyes, like Jun's (387:1631).
// These are the art's fills, not UI colours, so they live with the art.
const faces = {
  ava: { Eyes: avaEyes, body: '#22A06B' },
  dani: { Eyes: daniEyes, body: '#F4C22B' },
  hana: { Eyes: hanaEyes, body: '#F6A8C8' },
  lea: { Eyes: leaEyes, body: '#F08A2E' },
};

/** Profile avatar: a circle of the character's colour, cropped in on its eyes. */
export function FaceAvatar({ person, size }: { person: Person; size: number }) {
  const face = faces[person.id as keyof typeof faces];
  if (!face) return <Avatar person={person} size={size} />;
  const { Eyes, body } = face;
  return (
    <View
      importantForAccessibility="no-hide-descendants"
      style={{
        width: size,
        height: size,
        borderRadius: radius.full,
        backgroundColor: body,
        alignItems: 'center',
        justifyContent: 'center',
        overflow: 'hidden',
      }}>
      <Eyes width={size} height={size} />
    </View>
  );
}

/** The person's character art alone, for banners. */
export const personArt = (id: string) => art[id as keyof typeof art];

/** A person's character on a tinted ring. 58 in lists. */
export function Avatar({ person, size = 58 }: { person: Person; size?: number }) {
  const Art = personArt(person.id);
  const inner = (size * 46) / 58;
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
