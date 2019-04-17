import { AUTH_CONFIG } from '../Auth/auth0-variables';
import Twilio from 'twilio';
import { stripPhoneNumber } from './strip-phone-number';

let twilio;

export const verifyPhoneWithTwilio = async (phone) => {
  const strippedPhone = stripPhoneNumber(phone);
  if (!strippedPhone || strippedPhone.length <= 0) {
    return {
      verifiedPhone: null,
      error: 'Phone is not a valid phone number (must be "+" or numbers)'
    }
  }
  
  if (!twilio) {
    twilio = new Twilio(AUTH_CONFIG.twilioSid, AUTH_CONFIG.twilioToken);
  }

  const response = await twilio.lookups.phoneNumbers(strippedPhone).fetch();
  console.log('twilio response', response);
  if (!response || !response.phone_number || response.phone_number.length <= 0) {
    return {
      verifiedPhone: null,
      error: `error verifying phone (${strippedPhone}) with twilio: ${response}`
    }
  }

  return {
    verifiedPhone: response.phone_number,
    error: null,
  }
}
