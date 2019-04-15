import { AUTH_CONFIG } from '../Auth/auth0-variables';

export const confirmAuth0AccessToken = async (accessToken) => {
  const response = await fetch(`${AUTH_CONFIG.apiEndpoint}/userinfo?access_token=${accessToken}`, { 
    method: 'GET',
    headers: {
      'Content-Type': 'application/json'
    },
  });
  if (!response.ok) {
    console.warn(`confirming access token failed: \n` +
      `http status: ${response.status} statusText: ${response.statusText} response: ${JSON.stringify(response)}`);
    return null;
  }
  const confirmedTokenPayload = await response.json();

  return confirmedTokenPayload;
}
