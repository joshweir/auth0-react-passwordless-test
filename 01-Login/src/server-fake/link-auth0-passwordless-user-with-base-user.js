import { confirmAuth0AccessToken } from './confirm-auth0-access-token';
import { linkAuth0Users } from './link-auth0-users';
import { getOrCreateBaseAuth0UserByEmail } from './get-or-create-base-auth0-user-by-email';
import { getAuth0ManagementAPIToken } from './get-auth0-management-api-token';
import { getUserEmail } from './get-user-email';

export const linkAuth0PhonePasswordlessUserWithBaseUser = async ({ accessToken, userConversationIdentifier, emailBasedAccessToken }) => {
  try {
    const { email, error: getEmailError } = await getUserEmail({ 
      userConversationIdentifier, 
      emailBasedAccessToken 
    });
    if (!email) {
      const error = `Could not retrieve user email: ${getEmailError}`;
      console.warn(error);
      throw new Error(error);
    }

    const confirmedTokenPayload = await confirmAuth0AccessToken(accessToken);
    if (!confirmedTokenPayload) {
      const error = `Auth0 says access token is invalid: ${accessToken}`;
      console.warn(error);
      throw new Error(error);
    }
    console.log('confirmed token payload', confirmedTokenPayload);
    if (!confirmedTokenPayload.phone_number) {
      const error = `token does not have a phone number associated`;
      console.warn(error);
      throw new Error(error);
    }

    const token = await getAuth0ManagementAPIToken();

    // call the merge endpoint, merging the input auth0 account with the base account, base account user_id: auth0|[email]
    const baseAuth0User = await getOrCreateBaseAuth0UserByEmail(token, email);
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
