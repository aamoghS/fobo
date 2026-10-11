import { PaperSpirit } from '@/components/PaperSpirit';
import { SHAPES } from '@/data/profile';
import { stretchFor, type Character } from '@/features/profile/character';
import { color } from '@/styles/tokens';

/** The user's character. Shape, colour, eyes and height all apply live. */
export function CharacterArt({ character, size }: { character: Character; size: number }) {
  const shape = SHAPES.find((s) => s.key === character.shape) ?? SHAPES[0];
  return <PaperSpirit mood={shape.art} size={size} color={color[character.color]} stretch={stretchFor(character.height)} eyes={character.eyes} />;
}
