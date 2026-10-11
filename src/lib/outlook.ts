// Outlook Calendar, alongside Google's (src/routes/google.ts on the API). The API side is still to come:
// once it has a route that links a Microsoft account and syncs it into events, open it from here the way
// src/lib/google-auth.ts opens Google sign-in, and resolve true when the account is linked.

/** True once Outlook is linked; false until the API supports it. */
export async function connectOutlook(): Promise<boolean> {
  return false;
}
