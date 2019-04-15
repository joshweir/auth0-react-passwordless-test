import { AUTH_CONFIG } from '../Auth/auth0-variables';

export const getBaseAuth0UserByEmail = async (email) => {
  const url = new URL(`${AUTH_CONFIG.apiEndpoint}/api/v2/users`);
  url.search = new URLSearchParams({
    search_engine: 'v3',
    q: `identities.connection: "Username-Password-Authentication" AND email:"${email}"`,
  });
  const response = await fetch(url, { 
    method: 'GET',
    headers: {
      'Authorization': `Bearer ${AUTH_CONFIG.backendToken}`,
      'Content-Type': 'application/json'
    },
  });
  if (!response.ok) {
    throw new Error(`auth0 find with email ${email} failed: \n` +
      `http status: ${response.status} statusText: ${response.statusText} response: ${JSON.stringify(response)}`);
  }
  const [user] = await response.json();

  return user;
}
