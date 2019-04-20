import { getUserEmail } from './get-user-email';

export const loadUserPhoneLambda = async ({ userConversationIdentifier, emailBasedAccessToken }) => {
  const email = await getUserEmail({ 
    userConversationIdentifier, 
    emailBasedAccessToken 
  });
  if (!email) {
    return null;
  }

  // mock loading the phone number from user db record
  const phone = localStorage.getItem(`userPhone|${email}`);
  if (!phone) {
    return null;
  }

  return phone;
};
