// mock loading the userConversationIdentifier from userConversationIdentifier table by sha1 value
export const loadUserConversationIdentifier = async (userConversationIdentifier) => 
  localStorage.getItem(`magicUserId|${userConversationIdentifier}`);