import { loadUserConversationIdentifier } from './load-user-conversation-identifier';
import { stripPhoneNumber } from '../common-util/strip-phone-number';
import { verifyPhoneWithTwilio } from './verify-phone-with-twilio';

const verifyAndUpdateUserPhoneFromUserConversationIdentifier = async (userConversationIdentifier, phone) => {
  // mock loading the magicUserIdentifier from magicUserIdentifier table by sha1 value
  const userIdentifierRaw = await loadUserConversationIdentifier(userConversationIdentifier);
  if (!userIdentifierRaw) {
    return { 
      phone: null,
      error: 'Invalid userConversationIdentifier',
    };
  }

  const { email } = JSON.parse(userIdentifierRaw);
  if (!email) {
    console.warn('Could not retrieve email from user conversation identifier', userIdentifierRaw);
    return {
      phone: null,
      error: 'Invalid userConversationIdentifier'
    };
  }

  // if a phone is not already associated to the user
  const existingPhone = localStorage.getItem(`userPhone|${email}`);
  if (existingPhone) {
    return {
      phone: existingPhone,
      error: 'User already has a phone number'
    }
  }

  // strip phone and call twilio to verify phone
  const { verifiedPhone, error } = await verifyPhoneWithTwilio(phone);
  if (!verifiedPhone) {
    return { 
      error,
      phone: null,
    };
  }

  // mock call comproc to update verified phone 
  localStorage.setItem(`userPhone|${email}`, verifiedPhone);

  // return verified phone optimistically
  return {
    phone: verifiedPhone,
    error: null,
  }
}

export const verifyAndUpdateUserPhone = async ({ userConversationIdentifier, phone }) => {
  const strippedPhone = stripPhoneNumber(phone);
  if (!strippedPhone) {
    return {
      phone: null,
      error: 'Phone is not a valid phone number (must be "+" or numbers)'
    }
  }

  if (!!userConversationIdentifier) {
    return await verifyAndUpdateUserPhoneFromUserConversationIdentifier(userConversationIdentifier, strippedPhone);
  }

  return { 
    phone: null,
    error: 'Invalid userConversationIdentifier',
  };
};
