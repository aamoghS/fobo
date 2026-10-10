import { Alert, Platform } from 'react-native';

/** A short message the user has to see, like a failed sign-in. */
export function notify(message: string) {
  if (Platform.OS === 'web') window.alert(message);
  else Alert.alert('Fobo', message);
}
