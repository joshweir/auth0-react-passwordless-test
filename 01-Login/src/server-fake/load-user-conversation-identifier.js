// mock loading the magicUserIdentifier from magicUserIdentifier table by sha1 value
export const loadUserConversationIdentifier = async (userConversationIdentifier) => 
  localStorage.getItem(`magicUserId|${userConversationIdentifier}`);