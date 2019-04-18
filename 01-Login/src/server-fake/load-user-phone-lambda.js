import { loadUserConversationIdentifier } from './load-user-conversation-identifier';
import { confirmAuth0AccessToken } from './confirm-auth0-access-token';

const loadUserPhoneFromUserConversationIdentifier = async (userConversationIdentifier) => {
  // mock loading the magicUserIdentifier from magicUserIdentifier table by sha1 value
  const userIdentifierRaw = await loadUserConversationIdentifier(userConversationIdentifier);
  if (!userIdentifierRaw) {
    return null;
  }

  const { email } = JSON.parse(userIdentifierRaw);
  if (!email) {
    console.warn('Could not retrieve email from user conversation identifier', userIdentifierRaw);
    return null;
  }

  // mock loading the phone number from user db record
  const phone = localStorage.getItem(`userPhone|${email}`);
  if (!phone) {
    return null;
  }

  return phone;
}

const loadUserPhoneViaAuth0EmailBasedAccessToken = async (accessToken) => {
  // verify token with auth0 and extract email
  const confirmedTokenPayload = await confirmAuth0AccessToken(accessToken);
  if (!confirmedTokenPayload) {
    console.warn(`Auth0 says access token is invalid: ${accessToken}`);
    return null;
  }
  console.log('confirmed token payload', confirmedTokenPayload);
  if (!confirmedTokenPayload.email) {
    console.warn(`token does not have an email associated (to use to load user phone number)`);
    return null;
  }

  // mock loading the phone number from user db record
  const phone = localStorage.getItem(`userPhone|${confirmedTokenPayload.email}`);
  if (!phone) {
    return null;
  }

  return phone;
}

export const loadUserPhoneLambda = async ({ userConversationIdentifier, emailBasedAccessToken }) => {
  if (!!userConversationIdentifier) {
    return await loadUserPhoneFromUserConversationIdentifier(userConversationIdentifier);
  }

  if (!!emailBasedAccessToken) {
    return await loadUserPhoneViaAuth0EmailBasedAccessToken(emailBasedAccessToken);
  }

  return null;
};
