import { AUTH_CONFIG } from '../Auth/auth0-variables';

export const prefixPhoneCountryCode = (phone) => 
  phone[0] === '+' 
  ? phone 
  : `${AUTH_CONFIG.awsRegion === 'ap-southeast-2' ? `+61` : `+1`}${phone}`;
