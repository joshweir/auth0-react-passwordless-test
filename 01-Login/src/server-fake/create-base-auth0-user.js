import { AUTH_CONFIG } from '../Auth/auth0-variables';
import { buildBaseAuth0User } from './build-base-auth0-user';

export const createBaseAuth0User = async (token, email) => {
  const response = await fetch(`${AUTH_CONFIG.apiEndpoint}/api/v2/users`, { 
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(buildBaseAuth0User(email)),
  });
  const responseObject = await response.json();
  if (!response.ok) {
    throw new Error(`auth0 create user with email ${email} failed: \n` +
      `http status: ${response.status} statusText: ${response.statusText} response: ${JSON.stringify(responseObject)}`);
  }

  return responseObject;
};
