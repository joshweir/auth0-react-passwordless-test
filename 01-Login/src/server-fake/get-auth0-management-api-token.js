import { AUTH_CONFIG } from '../Auth/auth0-variables';

export const getAuth0ManagementAPIToken = async () => {
  const response = await fetch(`${AUTH_CONFIG.apiEndpoint}/oauth/token`, { 
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      client_id: AUTH_CONFIG.backendClientId,
      client_secret: AUTH_CONFIG.backendClientSecret,
      audience: `${AUTH_CONFIG.apiEndpoint}/api/v2/`,
      grant_type: "client_credentials",
    }),
  });
  const responseBody = await response.json();
  if (!response.ok) {
    throw new Error(`auth0 get token failed: \n` +
      `http status: ${response.status} statusText: ${response.statusText} response: ${JSON.stringify(responseBody)}`);
  }

  return responseBody.access_token;
};
