import { loadUserConversationIdentifier } from './load-user-conversation-identifier';
import { confirmAuth0AccessToken } from './confirm-auth0-access-token';

export const getUserEmail = async ({ userConversationIdentifier, emailBasedAccessToken }) => {
  if (!!userConversationIdentifier) {
    // mock loading the userConversationIdentifier from userConversationIdentifier table by sha1 value
    const userIdentifierRaw = await loadUserConversationIdentifier(userConversationIdentifier);
    if (!userIdentifierRaw) {
      return { 
        email: null,
        error: 'Invalid userConversationIdentifier',
      };
    }

    const { email } = JSON.parse(userIdentifierRaw);
    if (!email) {
      console.warn('Could not retrieve email from user conversation identifier', userIdentifierRaw);
      return {
        email: null,
        error: 'Invalid userConversationIdentifier'
      };
    }

    return {
      email,
      error: null,
    }
  }

  if (!!emailBasedAccessToken) {
    // verify token with auth0 and extract email
    const confirmedTokenPayload = await confirmAuth0AccessToken(emailBasedAccessToken);
    if (!confirmedTokenPayload) {
      console.warn(`Auth0 says access token is invalid: ${emailBasedAccessToken}`);
      return { 
        email: null,
        error: 'Invalid email based access token',
      };
    }
    console.log('confirmed token payload', confirmedTokenPayload);
    if (!confirmedTokenPayload.email) {
      console.warn(`token does not have an email associated (to use to load user phone number)`);
      return { 
        email: null,
        error: 'Email based access token does not contain an email',
      };
    }

    return {
      email: confirmedTokenPayload.email,
      error: null,
    }
  }

  return {
    email: null,
    error: 'No userConversationIdentifier or emailBasedAccessToken',
  }
}
