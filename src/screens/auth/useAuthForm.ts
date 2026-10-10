import { useState } from 'react';

type AuthField = 'name' | 'email' | 'password';

type Mode = 'signup' | 'login' | 'forgot';

const FIELDS: Record<Mode, readonly AuthField[]> = {
  signup: ['name', 'email', 'password'],
  login: ['email', 'password'],
  forgot: ['email'],
};

/** Hints aren't in Figma yet: they need a pass from UX writing. */
const RULES: Record<AuthField, { ok: (value: string) => boolean; hint: string }> = {
  name: { ok: (value) => value.trim() !== '', hint: 'Enter your name' },
  email: {
    ok: (value) => /^[^\s@]+@[^\s@]+\.[a-z]{2,}$/i.test(value.trim()),
    hint: 'Enter a valid email, like name@example.com',
  },
  password: { ok: (value) => value.length >= 8, hint: 'Use at least 8 characters for your password' },
};

/** Shared field feedback for email signup, login and forgot password. Validation begins on blur or submit. */
export function useAuthForm(mode: Mode) {
  const fields = FIELDS[mode];
  const [values, setValues] = useState<Record<AuthField, string>>({ name: '', email: '', password: '' });
  const [seen, setSeen] = useState<Record<AuthField, boolean>>({ name: false, email: false, password: false });
  const [shakes, setShakes] = useState<Record<AuthField, number>>({ name: 0, email: 0, password: 0 });
  const [hintField, setHintField] = useState<AuthField | null>(null);

  const bad = (key: AuthField) => !RULES[key].ok(values[key]);
  const red = (key: AuthField) => seen[key] && bad(key);
  const ready = fields.every((key) => !bad(key));
  const visibleHint = hintField && red(hintField) ? hintField : fields.find(red);

  const flag = (invalidFields: readonly AuthField[]) => {
    setSeen((previous) => ({ ...previous, ...Object.fromEntries(invalidFields.map((key) => [key, true])) }));
    setShakes((previous) => ({
      ...previous,
      ...Object.fromEntries(invalidFields.map((key) => [key, previous[key] + 1])),
    }));
  };

  const field = (key: AuthField) => ({
    value: values[key],
    onChangeText: (value: string) => {
      setValues((previous) => ({ ...previous, [key]: value }));
      setHintField(key);
    },
    onFocus: () => setHintField(key),
    onBlur: () => {
      if (bad(key) && !seen[key]) flag([key]);
      else setSeen((previous) => ({ ...previous, [key]: true }));
      setHintField(key);
    },
    invalid: red(key),
    shake: shakes[key],
    // Keep other invalid outlines visible without stacking several tooltips.
    error: visibleHint === key ? RULES[key].hint : undefined,
  });

  const submit = (onValid: () => void) => {
    const invalidFields = fields.filter(bad);
    if (invalidFields.length === 0) {
      onValid();
      return;
    }
    flag(invalidFields);
    setHintField(invalidFields[0]);
  };

  return { field, ready, submit };
}
