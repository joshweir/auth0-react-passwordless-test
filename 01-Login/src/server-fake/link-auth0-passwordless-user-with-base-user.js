import { confirmAuth0AccessToken } from './confirm-auth0-access-token';
import { linkAuth0Users } from './link-auth0-users';
import { getBaseAuth0UserByEmail } from './get-base-auth0-user-by-email';
import { getAuth0ManagementAPIToken } from './get-auth0-management-api-token';

const loadUserMagicIdentifierBySha1 = (userMagicIdentifier) => 
  JSON.parse(localStorage.getItem(`magicUserId|${userMagicIdentifier}`));

export const linkAuth0PasswordlessUserWithBaseUser = async ({ idTokenPayload, accessToken, userMagicIdentifier }) => {
  try {
    const token = await getAuth0ManagementAPIToken();

    // extract the authed type (email / sms - comes from the "sub" field in the idTokenPayload, 
    // eg. email|5cad5868a2cc5cb9c1013343, sms|5caee0eaa2cc5cb9c1059609) 
    // from the idToken, extract the phone number (if type sms) or email (if type email)
    if (!idTokenPayload.sub.startsWith('sms|')) {
      const error = 'token must be an sms connection in order to merge with base auth0 user';
      console.warn(error);
      throw new Error(error);
    }

    const idTokenPhone = idTokenPayload.phone_number;

    // confirm userMagicIdentifier is known to us, extract email and phone from magic link
    const userMagicIdentifierBlob = loadUserMagicIdentifierBySha1(userMagicIdentifier);
    if (!userMagicIdentifierBlob) {
      const error = 'invalid userMagicIdentifier';
      console.warn(error);
      throw new Error(error);
    }

    // confirm phone matches userMagicIdentifier 
    if (userMagicIdentifierBlob.phone !== idTokenPhone) {
      const error = `expected user phone number (${userMagicIdentifierBlob.phone}) ` +
        `does not match idToken phone_number (${idTokenPhone})`;
      console.warn(error);
      throw new Error(error);
    }

    // confirm accessToken is valid by calling auth0 endpoint, verify returned data sub, email, phone_number matches idTokenPayload
    const confirmedTokenPayload = await confirmAuth0AccessToken(accessToken);
    if (!confirmedTokenPayload) {
      const error = `Auth0 says access token is valid: ${accessToken}`;
      console.warn(error);
      throw new Error(error);
    }
    console.log('confirmed token payload', confirmedTokenPayload);
    if (confirmedTokenPayload.sub !== idTokenPayload.sub || confirmedTokenPayload.phone_number !== idTokenPhone) {
      const error = `Confirmed access token payload sub (${confirmedTokenPayload.sub}) ` +
        `does not match idToken payload sub (${idTokenPayload.sub})`;
      console.warn(error);
      throw new Error(error);
    }
    if (confirmedTokenPayload.phone_number !== idTokenPhone) {
      const error = `Confirmed access token payload sub (${confirmedTokenPayload.phone_number}) ` +
        `does not match idToken payload sub (${idTokenPhone})`;
      console.warn(error);
      throw new Error(error);
    }

    // call the merge endpoint, merging the input auth0 account with the base account, base account user_id: auth0|[email]
    const baseAuth0User = await getBaseAuth0UserByEmail(token, userMagicIdentifierBlob.email);
    if (!baseAuth0User) {
      const error = `No base auth0 user for email userMagicIdentifierBlob.email`;
      console.warn(error);
      throw new Error(error);
    }
    const baseAuth0UserId = baseAuth0User.user_id;
    const toMergeAuth0UserId = confirmedTokenPayload.sub;
    const toMergeAuth0UserProvider = 'sms';
    const response = await linkAuth0Users(
      token,
      baseAuth0UserId,
      toMergeAuth0UserId,
      toMergeAuth0UserProvider,
    );
    if (!response.ok) {
      const error = `linking auth0 base user (${baseAuth0UserId}) with ` +
        `${toMergeAuth0UserProvider} user (${toMergeAuth0UserId}) failed: \n` +
        `http status: ${response.status} statusText: ${response.statusText} response: ${JSON.stringify(await response.json())}`;
      console.warn(error);
      throw new Error(error);
    }

    return {
      statusCode: 200,
      ok: true
    };
  } catch(e) {
    return {
      statusCode: 500,
      ok: false,
    }
  }
}
