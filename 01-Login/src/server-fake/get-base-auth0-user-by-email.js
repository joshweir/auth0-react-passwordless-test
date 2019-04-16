import { AUTH_CONFIG } from '../Auth/auth0-variables';

export const getBaseAuth0UserByEmail = async (token, email) => {
  const url = new URL(`${AUTH_CONFIG.apiEndpoint}/api/v2/users`);
  url.search = new URLSearchParams({
    search_engine: 'v3',
    q: `(identities.connection: "Username-Password-Authentication" OR identities.connection: "email") AND email:"${email}"`,
  });
  const response = await fetch(url, { 
    method: 'GET',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    },
  });
  if (!response.ok) {
    throw new Error(`auth0 find with email ${email} failed: \n` +
      `http status: ${response.status} statusText: ${response.statusText} response: ${JSON.stringify(await response.json())}`);
  }
  const users = await response.json();
  const maybeVerifiedEmailUser = users.find(({ email_verified }) => !!email_verified);
  const user = maybeVerifiedEmailUser || users.length > 0 ? users[0] : undefined;

  return user;
}
