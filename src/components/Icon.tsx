import type { FC } from 'react';
import type { SvgProps } from 'react-native-svg';

import { color as tokens } from '@/styles/tokens';

import apple from '@/assets/icons/apple.svg';
import arrow from '@/assets/icons/arrow.svg';
import back from '@/assets/icons/back.svg';
import bell from '@/assets/icons/bell.svg';
import bolt from '@/assets/icons/bolt.svg';
import book from '@/assets/icons/book.svg';
import box from '@/assets/icons/box.svg';
import calendar from '@/assets/icons/calendar.svg';
import car from '@/assets/icons/car.svg';
import chain from '@/assets/icons/chain.svg';
import check from '@/assets/icons/check.svg';
import chevron from '@/assets/icons/chevron.svg';
import clock from '@/assets/icons/clock.svg';
import close from '@/assets/icons/close.svg';
import copy from '@/assets/icons/copy.svg';
import cup from '@/assets/icons/cup.svg';
import file from '@/assets/icons/file.svg';
import film from '@/assets/icons/film.svg';
import fork from '@/assets/icons/fork.svg';
import google from '@/assets/icons/google.svg';
import hand from '@/assets/icons/hand.svg';
import heart from '@/assets/icons/heart.svg';
import hide from '@/assets/icons/hide.svg';
import home from '@/assets/icons/home.svg';
import leaf from '@/assets/icons/leaf.svg';
import mail from '@/assets/icons/mail.svg';
import meeting from '@/assets/icons/meeting.svg';
import message from '@/assets/icons/message.svg';
import mic from '@/assets/icons/mic.svg';
import moon from '@/assets/icons/moon.svg';
import more from '@/assets/icons/more.svg';
import mountain from '@/assets/icons/mountain.svg';
import music from '@/assets/icons/music.svg';
import noise from '@/assets/icons/noise.svg';
import paste from '@/assets/icons/paste.svg';
import pencil from '@/assets/icons/pencil.svg';
import people from '@/assets/icons/people.svg';
import phone from '@/assets/icons/phone.svg';
import plans from '@/assets/icons/plans.svg';
import plus from '@/assets/icons/plus.svg';
import refresh from '@/assets/icons/refresh.svg';
import scissors from '@/assets/icons/scissors.svg';
import settings from '@/assets/icons/settings.svg';
import show from '@/assets/icons/show.svg';
import sun from '@/assets/icons/sun.svg';
import train from '@/assets/icons/train.svg';
import trash from '@/assets/icons/trash.svg';
import undo from '@/assets/icons/undo.svg';
import walk from '@/assets/icons/walk.svg';
import water from '@/assets/icons/water.svg';
import week from '@/assets/icons/week.svg';
import you from '@/assets/icons/you.svg';

// 50 tiles from Iconography (34:681), plus scissors and more from Event (368:9064).
const icons = {
  apple, arrow, back, bell, bolt, book, box, calendar, car, chain, check, chevron, clock, close,
  copy, cup, file, film, fork, google, hand, heart, hide, home, leaf, mail, meeting, message, mic,
  moon, more, mountain, music, noise, paste, pencil, people, phone, plans, plus, refresh, scissors,
  settings, show, sun, train, trash, undo, walk, water, week, you,
} satisfies Record<string, FC<SvgProps>>;

export type IconName = keyof typeof icons;

type Props = {
  name: IconName;
  size?: number;
  /** Stroke colour. Defaults to ink. `google` keeps its own colours. */
  color?: string;
};

export function Icon({ name, size = 24, color = tokens.ink }: Props) {
  const Svg = icons[name];
  return <Svg width={size} height={size} color={color} />;
}
