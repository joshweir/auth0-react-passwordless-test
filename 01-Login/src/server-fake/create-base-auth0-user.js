import { AUTH_CONFIG } from '../Auth/auth0-variables';

export const buildBaseAuth0User = (email) => ({
  email,
  email_verified: false,
	connection: "Username-Password-Authentication",
  verify_email: false,
	password: "S0me-password"
});

export const getBaseAuthUserByEmail = async (email) => {
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
      `http status: ${response.status} statusText: ${response.statusText} response: ${response}`);
  }
  const [user] = await response.json();

  return user;
}

export const baseAuthUserExists = async (email) => !!(await getBaseAuthUserByEmail(email));

export const createBaseAuth0User = async (email) => {
  if (!(await baseAuthUserExists(email))) {
    const response = await fetch(`${AUTH_CONFIG.apiEndpoint}/api/v2/users`, { 
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${AUTH_CONFIG.backendToken}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(buildBaseAuth0User(email)),
    });
    if (!response.ok) {
      throw new Error(`auth0 create user with email ${email} failed: \n` +
        `http status: ${response.status} statusText: ${response.statusText}`);
    }
  }
};
