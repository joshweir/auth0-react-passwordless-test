import { createHash } from 'crypto';

export const createConversationUserIdentifier = (email, conversationUri) => upsertConversationUserIdentifier(email, conversationUri);

const upsertConversationUserIdentifier = (email, conversationUri) => {
  const userBlob = {
    email,
    conversationUri,
    ts: Date.now()
  };
  const userBlobSha1 = createHash('sha1').update(JSON.stringify(userBlob)).digest('hex');
  const userIdentifier = { 
    ...userBlob, 
    sha1: userBlobSha1
  };
  // mock item being stored in a secure db table
  localStorage.setItem(
    `magicUserId|${userBlobSha1}`,
    JSON.stringify(userIdentifier),
  )

  return userIdentifier.sha1;
}
