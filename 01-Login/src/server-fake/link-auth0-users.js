import { AUTH_CONFIG } from '../Auth/auth0-variables';

export const linkAuth0Users = async (baseAuth0UserId, toMergeAuth0UserId, toMergeAuth0UserProvider) =>
  await fetch(`${AUTH_CONFIG.apiEndpoint}/api/v2/users/${baseAuth0UserId}/identities`, { 
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${AUTH_CONFIG.backendToken}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      user_id: toMergeAuth0UserId,
      provider: toMergeAuth0UserProvider,
    }),
  });
  