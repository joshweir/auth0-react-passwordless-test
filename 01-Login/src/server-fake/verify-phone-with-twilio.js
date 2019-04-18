import { AUTH_CONFIG } from '../Auth/auth0-variables';
import { stripPhoneNumber } from '../common-util/strip-phone-number';
import { prefixPhoneCountryCode } from './prefix-phone-country-code';

export const verifyPhoneWithTwilio = async (phone) => {
  const strippedPhone = prefixPhoneCountryCode(stripPhoneNumber(phone));
  if (!strippedPhone) {
    return {
      verifiedPhone: null,
      error: 'Phone is not a valid phone number (must be "+" or numbers)'
    }
  }

  const response = await fetch(`https://lookups.twilio.com/v1/PhoneNumbers/${strippedPhone}`, { 
    method: 'GET',
    headers: {
      'Authorization': `Basic ${Buffer.from(`${AUTH_CONFIG.twilioSid}:${AUTH_CONFIG.twilioToken}`).toString("base64")}`,
      'Content-Type': 'application/json'
    },
  });
  if (!response.ok) {
    return {
      verifiedPhone: null,
      error: response.status === 404 ? 
        `Unrecognized phone number: ${strippedPhone}` :
        `twilio phone number lookup (${strippedPhone}) failed: \n` +
        `http status: ${response.status} statusText: ${response.statusText} ` +
        `response: ${JSON.stringify(await response.json())}`
    };
  }
  const responseObject = await response.json();
  console.log('twilio response', responseObject);
  const { phone_number } = responseObject;
  if (!phone_number) {
    return {
      verifiedPhone: null,
      error: `error verifying phone (${strippedPhone}) with twilio: ${responseObject}`
    }
  }
  
  return {
    verifiedPhone: phone_number,
    error: null,
  }
}
