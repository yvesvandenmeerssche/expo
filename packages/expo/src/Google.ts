import { AppAuth } from 'expo-app-auth';
import { Constants } from 'expo-constants';
import { Platform } from 'react-native';

type LogInConfig = {
  androidClientId?: string;
  iosClientId?: string;
  clientId?: string;
  behavior?: 'system' | 'web';
  scopes?: string[];
};

type LogInResult =
  | {
      type: 'cancel';
    }
  | {
      type: 'success';
      accessToken?: string;
      idToken: string | null;
      refreshToken: string | null;
      user: {
        id?: string;
        name?: string;
        givenName?: string;
        familyName?: string;
        photoUrl?: string;
        email?: string;
      };
    };

/*
 * In the past, this module enabled a user to authenticate with either `native` or `web` behaviors.
 * Because of recent changes with the offical GoogleSignIn library, we can no longer use it in a sandboxed enviroment.
 * Specifically, the lib will throw a native error if the URL Schemes do not contain a scheme that matches the Firebase `REVERSE_CLIENT_ID`.
 *
 * Technically you could add this via the app.json.
 * We recommend you use the new `expo-google-sign-in` module for native authentication, in standalone or ExpoKit.
 *
 * The web behavior of Google Sign-In is pretty sophisticated and should be enough for a good UX.
 *
 * We've also extracted Native OAuth into a lib expo-app-auth.
 * Expo.Google is just a simple wrapper around it.
 * For more control like refreshing tokens, we recommend you extend AppAuth yourself.
 */

export async function logInAsync(config: LogInConfig): Promise<LogInResult> {
  const { behavior = 'web' } = config;

  if (behavior !== 'web') {
    if (Constants.appOwnership === 'expo') {
      console.warn(
        'Native Google Sign-In is only available in ExpoKit projects. Falling back to `web` behavior'
      );
    } else {
      console.warn(
        "Deprecated: Native Google Sign-In has been moved to Expo.GoogleSignIn ('expo-google-sign-in') Falling back to `web` behavior"
      );
    }
  }

  const userDefinedScopes = config.scopes || [];
  /* Add the required scopes for returning profile data. */
  const requiredScopes = [...userDefinedScopes, 'profile', 'email', 'openid'];
  /* Remove duplicates */
  const scopes = [...new Set(requiredScopes)];

  /* This is the CLIENT_ID generated from a Firebase project */
  const clientId =
    config.clientId ||
    Platform.select({
      ios: config.iosClientId,
      android: config.androidClientId,
      web: config.clientId,
    });

  try {
    const logInResult = await AppAuth.authAsync({
      issuer: 'https://accounts.google.com',
      scopes,
      clientId,
    });

    // Web login only returns an accessToken so use it to fetch the same info as the native login
    // does.
    const userInfoResponse = await fetch('https://www.googleapis.com/userinfo/v2/me', {
      headers: { Authorization: `Bearer ${logInResult.accessToken}` },
    });
    const userInfo = await userInfoResponse.json();
    console.log('EXGoogle: ', logInResult, userInfo);
    return {
      type: 'success',
      ...logInResult,
      user: {
        id: userInfo.id,
        name: userInfo.name,
        givenName: userInfo.given_name,
        familyName: userInfo.family_name,
        photoUrl: userInfo.picture,
        email: userInfo.email,
      },
    };
  } catch (error) {
    if (error.message.toLowerCase().indexOf('user cancelled') > -1) {
      return { type: 'cancel' };
    }
    throw error;
  }
}

export async function logOutAsync({ accessToken, clientId }): Promise<any> {
  const config = {
    issuer: 'https://accounts.google.com',
    clientId,
  };

  return await AppAuth.revokeAsync(config, {
    token: accessToken,
    isClientIdProvided: !!clientId,
  });
}
