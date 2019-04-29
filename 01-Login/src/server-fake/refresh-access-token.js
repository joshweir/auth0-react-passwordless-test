import { AUTH_CONFIG } from '../Auth/auth0-variables';

export const refreshAccessToken = async (refreshToken) => {
  const response = await fetch(`${AUTH_CONFIG.apiEndpoint}/oauth/token`, { 
    method: 'POST',
    headers: {
      'Content-Type': 'application/json' 
    },
    body: JSON.stringify({
      grant_type: 'refresh_token',
      client_id: AUTH_CONFIG.clientId,
      refresh_token: refreshToken,
    }),
  });
  if (!response.ok) {
    console.warn(`refreshing access token failed: \n` +
      `http status: ${response.status} statusText: ${response.statusText} response: ${JSON.stringify(await response.json())}`);
    return null;
  }
  const refreshedPayload = await response.json();

  return refreshedPayload;
}
