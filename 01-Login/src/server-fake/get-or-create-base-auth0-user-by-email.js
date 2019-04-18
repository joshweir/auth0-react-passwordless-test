import { getBaseAuth0UserByEmail } from './get-base-auth0-user-by-email';
import { createBaseAuth0User } from './create-base-auth0-user';

export const getOrCreateBaseAuth0UserByEmail = async (token, email) => {
  const user = await getBaseAuth0UserByEmail(token, email);
  if (user) {
    return user;
  }

  return await createBaseAuth0User(token, email);
};
