import { createHash } from 'crypto';
import { createBaseAuth0User } from './create-base-auth0-user';

export const createBaseAuth0UserAndSha1UserIdentifier = (email, phone) => {
  createBaseAuth0User(email);
  
  return upsertMagicUserIdentifier(email, phone);
};

const upsertMagicUserIdentifier = (email, phone) => {
  const userBlob = {
    email,
    phone,
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
