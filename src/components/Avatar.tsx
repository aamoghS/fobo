import { Text, View, type StyleProp, type ViewStyle } from 'react-native';

import type { Person } from '@/data/people';
import { SHAPES } from '@/data/profile';
import { stretchFor, type Character } from '@/features/profile/character';
import { color, radius } from '@/styles/tokens';
import { type } from '@/styles/type';

import { PaperSpirit } from './PaperSpirit';

/** A character as its person made it in Edit Character: shape, colour and height. */
export function CharacterFigure({ character, size, style }: { character: Character; size: number; style?: StyleProp<ViewStyle> }) {
  const shape = SHAPES.find((s) => s.key === character.shape) ?? SHAPES[0];
  return (
    <View style={style}>
      <PaperSpirit mood={shape.art} size={size} color={color[character.color]} stretch={stretchFor(character.height)} />
    </View>
  );
}

/** A person's character on a tinted ring, or their initial until they make one. 58 in lists. */
export function Avatar({ person, size = 58 }: { person: Person; size?: number }) {
  const inner = (size * 46) / 58;
  return (
    <View
      importantForAccessibility="no-hide-descendants"
      style={{
        width: size,
        height: size,
        borderRadius: radius.full,
        backgroundColor: color[person.tint] ?? color.tintSky,
        alignItems: 'center',
        justifyContent: 'center',
        overflow: 'hidden',
      }}>
      {person.character ? (
        <CharacterFigure character={person.character} size={inner} />
      ) : (
        <Text style={[size > 70 ? type.display : type.title, { color: color.ink }]}>{person.name.slice(0, 1).toUpperCase()}</Text>
      )}
    </View>
  );
}
