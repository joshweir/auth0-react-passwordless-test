import { createHash } from 'crypto';
import { createBaseAuth0User } from './create-base-auth0-user';
import { getAuth0ManagementAPIToken } from './get-auth0-management-api-token';

export const createBaseAuth0UserAndSha1UserIdentifier = async (email, phone) => {
  const token = await getAuth0ManagementAPIToken();
  createBaseAuth0User(token, email);
  
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
