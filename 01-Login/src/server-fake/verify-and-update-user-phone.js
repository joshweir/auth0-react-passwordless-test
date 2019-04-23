import { stripPhoneNumber } from '../common-util/strip-phone-number';
import { verifyPhoneWithTwilio } from './verify-phone-with-twilio';
import { getUserEmail } from './get-user-email';

export const verifyAndUpdateUserPhone = async ({ userConversationIdentifier, emailBasedAccessToken, phone }) => {
  const strippedPhone = stripPhoneNumber(phone);
  if (!strippedPhone) {
    return {
      phone: null,
      error: 'Phone is not a valid phone number (must be "+" or numbers)'
    }
  }

  const { email, error: getEmailError } = await getUserEmail({ 
    userConversationIdentifier, 
    emailBasedAccessToken 
  });
  if (!email) {
    return {
      phone: null,
      error: `Could not retrieve user email: ${getEmailError}`,
    }
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
};
