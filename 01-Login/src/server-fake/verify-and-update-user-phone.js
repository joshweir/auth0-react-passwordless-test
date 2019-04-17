import { loadUserConversationIdentifier } from './load-user-conversation-identifier';
import { stripPhoneNumber } from './strip-phone-number';
import { verifyPhoneWithTwilio } from './verify-phone-with-twilio';

const verifyAndUpdateUserPhoneFromUserConversationIdentifier = async (userConversationIdentifier, phone) => {
  // mock loading the magicUserIdentifier from magicUserIdentifier table by sha1 value
  const userIdentifierRaw = await loadUserConversationIdentifier(userConversationIdentifier);
  if (!userIdentifierRaw || userIdentifierRaw.length <= 0) {
    return { 
      phone: null,
      error: 'Invalid userConversationIdentifier',
    };
  }

  // strip phone and call twilio to verify phone
  const { verifiedPhone, error } = await verifyPhoneWithTwilio(phone);

  // call comproc to update verified phone

  // return verifiedPhone

  // any errors, return verifiedPhone: null, error: error message




  const { email } = JSON.parse(userIdentifierRaw);
  if (!email || email.length <= 0) {
    console.warn('Could not retrieve email from user conversation identifier', userIdentifierRaw);
    return null;
  }

  // mock loading the phone number from user db record
  const phone = localStorage.getItem(`userPhone|${email}`);
  if (!phone || phone.length <= 0) {
    return null;
  }

  return { 
    phone: verifiedPhone,
    error: null,
  };
}

export const verifyAndUpdateUserPhone = async ({ userConversationIdentifier, phone }) => {
  const strippedPhone = stripPhoneNumber(phone);
  if (!strippedPhone || strippedPhone.length <= 0) {
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
