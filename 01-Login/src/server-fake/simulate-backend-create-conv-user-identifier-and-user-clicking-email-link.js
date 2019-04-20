import { createConversationUserIdentifier } from './create-conversation-user-identifier';
import { loadUserPhoneLambda } from './load-user-phone-lambda';

export const simulateBackendCreateConvUserIdentifierAndUserClickingEmailLink = async (email, conversationUri) => {
  // this conversation identifier would have been created in the back end before the email link was generated and email sent
  const userConversationIdentifier = createConversationUserIdentifier(email, conversationUri);

  // at this point the user has clicked on the email link, on the landing page with userConversationIdentifier in url param, 
  // at this point we automatically call lambda with userConversationIdentifier to retrieve the user phone number if it exists
  const phone = await loadUserPhoneLambda({ userConversationIdentifier });

  return {
    userConversationIdentifier, 
    phone,
  }
};