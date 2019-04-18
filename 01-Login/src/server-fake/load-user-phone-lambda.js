import { loadUserConversationIdentifier } from './load-user-conversation-identifier';

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

export const loadUserPhoneLambda = async ({ userConversationIdentifier }) => {
  if (!!userConversationIdentifier) {
    return await loadUserPhoneFromUserConversationIdentifier(userConversationIdentifier);
  }

  return null;
};
