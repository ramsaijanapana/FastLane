import * as AuthSession from 'expo-auth-session';
import * as WebBrowser from 'expo-web-browser';

import type { AuthSession as FastlaneAuthSession, SocialAuthProvider } from '../types';
import { apiBaseUrl, completeOAuthSession } from './api';

WebBrowser.maybeCompleteAuthSession();

const providerLabels: Record<SocialAuthProvider, string> = {
  google: 'Google',
  facebook: 'Facebook',
};

export const startSocialLogin = async (
  provider: SocialAuthProvider,
): Promise<FastlaneAuthSession | null> => {
  const redirectUri = AuthSession.makeRedirectUri({
    path: 'auth',
    preferLocalhost: true,
  });
  const startUrl = new URL(`${apiBaseUrl}/auth/oauth/${provider}/start`);
  startUrl.searchParams.set('redirect_uri', redirectUri);

  const result = await WebBrowser.openAuthSessionAsync(
    startUrl.toString(),
    redirectUri,
  );

  if (result.type !== 'success') {
    return null;
  }

  const callbackUrl = new URL(result.url);
  const error = callbackUrl.searchParams.get('error');

  if (error) {
    throw new Error(error);
  }

  const handoff = callbackUrl.searchParams.get('handoff');

  if (!handoff) {
    throw new Error(
      `${providerLabels[provider]} sign-in did not return a handoff code.`,
    );
  }

  const response = await completeOAuthSession({ handoff });
  return response.session;
};
