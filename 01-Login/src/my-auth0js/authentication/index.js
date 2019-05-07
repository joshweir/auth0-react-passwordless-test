import qs from 'qs';

import objectHelper from '../helper/object';
import assert from '../helper/assert';
// import windowHelper from '../helper/window';
import parametersWhitelist from '../helper/parameters-whitelist';
// import WebAuth from '../web-auth/index';

/**
 * Creates a new Auth0 Authentication API client
 * @constructor
 * @param {Object} options
 * @param {String} options.domain your Auth0 domain
 * @param {String} options.clientID the Client ID found on your Application settings page
 * @param {String} [options.redirectUri] url that the Auth0 will redirect after Auth with the Authorization Response
 * @param {String} [options.responseType] type of the response used by OAuth 2.0 flow. It can be any space separated list of the values `code`, `token`, `id_token`. {@link https://openid.net/specs/oauth-v2-multiple-response-types-1_0.html}
 * @param {String} [options.responseMode] how the Auth response is encoded and redirected back to the client. Supported values are `query`, `fragment` and `form_post`. {@link https://openid.net/specs/oauth-v2-multiple-response-types-1_0.html#ResponseModes}
 * @param {String} [options.scope] scopes to be requested during Auth. e.g. `openid email`
 * @param {String} [options.audience] identifier of the resource server who will consume the access token issued after Auth
 * @see {@link https://auth0.com/docs/api/authentication}
 */
function Authentication(auth0, options) {
  // If we have two arguments, the first one is a WebAuth instance, so we assign that
  // if not, it's an options object and then we should use that as options instead
  // this is here because we don't want to break people coming from v8
  if (arguments.length === 2) {
    this.auth0 = auth0;
  } else {
    options = auth0;
  }

  /* eslint-disable */
  assert.check(
    options,
    { type: 'object', message: 'options parameter is not valid' },
    {
      domain: { type: 'string', message: 'domain option is required' },
      clientID: { type: 'string', message: 'clientID option is required' },
      responseType: { optional: true, type: 'string', message: 'responseType is not valid' },
      responseMode: { optional: true, type: 'string', message: 'responseMode is not valid' },
      redirectUri: { optional: true, type: 'string', message: 'redirectUri is not valid' },
      scope: { optional: true, type: 'string', message: 'scope is not valid' },
      audience: { optional: true, type: 'string', message: 'audience is not valid' },
      _disableDeprecationWarnings: {
        optional: true,
        type: 'boolean',
        message: '_disableDeprecationWarnings option is not valid'
      },
      _sendTelemetry: {
        optional: true,
        type: 'boolean',
        message: '_sendTelemetry option is not valid'
      },
      _telemetryInfo: {
        optional: true,
        type: 'object',
        message: '_telemetryInfo option is not valid'
      }
    }
  );
  /* eslint-enable */

  this.baseOptions = options;
  this.baseOptions._sendTelemetry = false;

  this.baseOptions.rootUrl = 'https://' + this.baseOptions.domain;
}

/**
 * Builds and returns the `/authorize` url in order to initialize a new authN/authZ transaction
 *
 * @method buildAuthorizeUrl
 * @param {Object} options
 * @param {String} [options.clientID] the Client ID found on your Application settings page
 * @param {String} options.redirectUri url that the Auth0 will redirect after Auth with the Authorization Response
 * @param {String} options.responseType type of the response used by OAuth 2.0 flow. It can be any space separated list of the values `code`, `token`, `id_token`. {@link https://openid.net/specs/oauth-v2-multiple-response-types-1_0.html}
 * @param {String} [options.responseMode] how the Auth response is encoded and redirected back to the client. Supported values are `query`, `fragment` and `form_post`. {@link https://openid.net/specs/oauth-v2-multiple-response-types-1_0.html#ResponseModes}
 * @param {String} [options.state] value used to mitigate XSRF attacks. {@link https://auth0.com/docs/protocols/oauth2/oauth-state}
 * @param {String} [options.nonce] value used to mitigate replay attacks when using Implicit Grant. {@link https://auth0.com/docs/api-auth/tutorials/nonce}
 * @param {String} [options.scope] scopes to be requested during Auth. e.g. `openid email`
 * @param {String} [options.audience] identifier of the resource server who will consume the access token issued after Auth
 * @see {@link https://auth0.com/docs/api/authentication#authorize-client}
 * @see {@link https://auth0.com/docs/api/authentication#social}
 */
Authentication.prototype.buildAuthorizeUrl = function(options) {
  var params;
  var qString;

  assert.check(options, { type: 'object', message: 'options parameter is not valid' });

  params = objectHelper
    .merge(this.baseOptions, [
      'clientID',
      'responseType',
      'responseMode',
      'redirectUri',
      'scope',
      'audience'
    ])
    .with(options);

  /* eslint-disable */
  assert.check(
    params,
    { type: 'object', message: 'options parameter is not valid' },
    {
      clientID: { type: 'string', message: 'clientID option is required' },
      redirectUri: { optional: true, type: 'string', message: 'redirectUri option is required' },
      responseType: { type: 'string', message: 'responseType option is required' },
      nonce: {
        type: 'string',
        message: 'nonce option is required',
        condition: function(o) {
          return o.responseType.indexOf('code') === -1 && o.responseType.indexOf('id_token') !== -1;
        }
      },
      scope: { optional: true, type: 'string', message: 'scope option is required' },
      audience: { optional: true, type: 'string', message: 'audience option is required' }
    }
  );
  /* eslint-enable */

  if (params.connection_scope && Array.isArray(params.connection_scope)) {
    params.connection_scope = params.connection_scope.join(',');
  }

  params = objectHelper.blacklist(params, [
    'username',
    'popupOptions',
    'domain',
    'tenant',
    'timeout'
  ]);
  params = objectHelper.toSnakeCase(params, ['auth0Client']);
  params = parametersWhitelist.oauthAuthorizeParams(params);

  qString = qs.stringify(params);

  return `${this.baseOptions.rootUrl}/authorize?${qString}`;
};

/**
 * Makes a call to the `/userinfo` endpoint and returns the user profile
 *
 * @method userInfo
 * @param {String} accessToken token issued to a user after Auth
 * @param {userInfoCallback} cb
 * @see   {@link https://auth0.com/docs/api/authentication#get-user-info}
 */
Authentication.prototype.userInfo = async function(accessToken, cb) {
  assert.check(accessToken, { type: 'string', message: 'accessToken parameter is not valid' });
  assert.check(cb, { type: 'function', message: 'cb parameter is not valid' });

  const url = `${this.baseOptions.rootUrl}/userinfo`;

  const response = await fetch(url, { 
    method: 'GET',
    headers: {
      'Authorization': `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
  });
  if (!response.ok) {
    const error = `confirming access token failed: \n` +
    `http status: ${response.status} statusText: ${response.statusText} response: ${JSON.stringify(await response.json())}`;
    // console.warn(error);
    return cb({ original: error });
  }
  return cb(null, await response.json());
};

/**
 * Builds and returns the Logout url in order to initialize a new authN/authZ transaction
 *
 * If you want to navigate the user to a specific URL after the logout, set that URL at the returnTo parameter. The URL should be included in any the appropriate Allowed Logout URLs list:
 *
 * - If the client_id parameter is included, the returnTo URL must be listed in the Allowed Logout URLs set at the Auth0 Application level (see Setting Allowed Logout URLs at the App Level).
 * - If the client_id parameter is NOT included, the returnTo URL must be listed in the Allowed Logout URLs set at the account level (see Setting Allowed Logout URLs at the Account Level).
 * @method buildLogoutUrl
 * @param {Object} options
 * @param {String} [options.clientID] the Client ID found on your Application settings page
 * @param {String} [options.returnTo] URL to be redirected after the logout
 * @param {Boolean} [options.federated] tells Auth0 if it should logout the user also from the IdP.
 * @see {@link https://auth0.com/docs/api/authentication#logout}
 */
Authentication.prototype.buildLogoutUrl = function(options) {
  var params;
  var qString;

  assert.check(options, {
    optional: true,
    type: 'object',
    message: 'options parameter is not valid'
  });

  params = objectHelper.merge(this.baseOptions, ['clientID']).with(options || {});

  params = objectHelper.toSnakeCase(params, ['auth0Client', 'returnTo']);

  qString = qs.stringify(objectHelper.blacklist(params, ['federated']));
  if (
    options &&
    options.federated !== undefined &&
    options.federated !== false &&
    options.federated !== 'false'
  ) {
    qString += '&federated';
  }

  return `${this.baseOptions.rootUrl}/v2/logout?${qString}`;
};

export default Authentication;
