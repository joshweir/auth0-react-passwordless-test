import IdTokenVerifier from 'idtoken-verifier';
import qs from 'qs';

import assert from '../helper/assert';
import TransactionManager from './transaction-manager';
import Authentication from '../authentication';
import objectHelper from '../helper/object';
import WebMessageHandler from './web-message-handler';
import SSODataStorage from '../helper/ssodata';
import SilentAuthenticationHandler from './silent-authentication-handler';

/**
 * Handles all the browser's AuthN/AuthZ flows
 * @constructor
 * @param {Object} options
 * @param {String} options.domain your Auth0 domain
 * @param {String} options.clientID the Client ID found on your Application settings page
 * @param {String} [options.redirectUri] url that the Auth0 will redirect after Auth with the Authorization Response
 * @param {String} [options.responseType] type of the response used by OAuth 2.0 flow. It can be any space separated list of the values `code`, `token`, `id_token`. {@link https://openid.net/specs/oauth-v2-multiple-response-types-1_0.html}
 * @param {String} [options.responseMode] how the Auth response is encoded and redirected back to the client. Supported values are `query`, `fragment` and `form_post`. The `query` value is only supported when `responseType` is `code`. {@link https://openid.net/specs/oauth-v2-multiple-response-types-1_0.html#ResponseModes}
 * @param {String} [options.scope] scopes to be requested during Auth. e.g. `openid email`
 * @param {String} [options.audience] identifier of the resource server who will consume the access token issued after Auth
 * @param {Array} [options.plugins]
 * @param {Number} [options._timesToRetryFailedRequests] Number of times to retry a failed request, according to {@link https://github.com/visionmedia/superagent/blob/master/lib/request-base.js}
 * @see {@link https://auth0.com/docs/api/authentication}
 */
export function WebAuth(options) {
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
      popupOrigin: { optional: true, type: 'string', message: 'popupOrigin is not valid' },
      leeway: { optional: true, type: 'number', message: 'leeway is not valid' },
      plugins: { optional: true, type: 'array', message: 'plugins is not valid' },
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
      },
      _timesToRetryFailedRequests: {
        optional: true,
        type: 'number',
        message: '_timesToRetryFailedRequests option is not valid'
      }
    }
  );

  if (options.overrides) {
    assert.check(
      options.overrides,
      { type: 'object', message: 'overrides option is not valid' },
      {
        __tenant: { optional: true, type: 'string', message: '__tenant option is required' },
        __token_issuer: {
          optional: true,
          type: 'string',
          message: '__token_issuer option is required'
        },
        __jwks_uri: { optional: true, type: 'string', message: '__jwks_uri is required' }
      }
    );
  }
  /* eslint-enable */

  this.baseOptions = options;
  // this.baseOptions.plugins = new PluginHandler(this, this.baseOptions.plugins || []);

  this.baseOptions._sendTelemetry = false;

  this.baseOptions._timesToRetryFailedRequests = options._timesToRetryFailedRequests
    ? parseInt(options._timesToRetryFailedRequests, 0)
    : 0;

  this.baseOptions.tenant =
    (this.baseOptions.overrides && this.baseOptions.overrides.__tenant) ||
    this.baseOptions.domain.split('.')[0];

  this.baseOptions.token_issuer =
    (this.baseOptions.overrides && this.baseOptions.overrides.__token_issuer) ||
    'https://' + this.baseOptions.domain + '/';

  this.baseOptions.jwksURI = this.baseOptions.overrides && this.baseOptions.overrides.__jwks_uri;

  this.transactionManager = new TransactionManager(this.baseOptions);

  this.client = new Authentication(this.baseOptions);
  this.webMessageHandler = new WebMessageHandler(this);
  this.ssodataStorage = new SSODataStorage(this.baseOptions);
}

/**
 * Parse the url hash and extract the Auth response from a Auth flow started with {@link authorize}
 *
 * Only validates id_tokens signed by Auth0 using the RS256 algorithm using the public key exposed
 * by the `/.well-known/jwks.json` endpoint of your account.
 * Tokens signed with the HS256 algorithm cannot be properly validated.
 * Instead, a call to {@link userInfo} will be made with the parsed `access_token`.
 * If the {@link userInfo} call fails, the {@link userInfo} error will be passed to the callback.
 * Tokens signed with other algorithms will not be accepted.
 *
 * @method parseHash
 * @param {Object} options
 * @param {String} options.hash the url hash. If not provided it will extract from window.location.hash
 * @param {String} [options.state] value originally sent in `state` parameter to {@link authorize} to mitigate XSRF
 * @param {String} [options.nonce] value originally sent in `nonce` parameter to {@link authorize} to prevent replay attacks
 * @param {String} [options.responseType] type of the response used by OAuth 2.0 flow. It can be any space separated list of the values `token`, `id_token`. For this specific method, we'll only use this value to check if the hash contains the tokens requested in the responseType.
 * @param {authorizeCallback} cb
 */
WebAuth.prototype.parseHash = function(options, cb) {
  var parsedQs;
  var err;

  if (!cb && typeof options === 'function') {
    cb = options;
    options = {};
  } else {
    options = options || {};
  }

  var _window = window;

  var hashStr = options.hash === undefined ? _window.location.hash : options.hash;
  hashStr = hashStr.replace(/^#?\/?/, '');

  parsedQs = qs.parse(hashStr);

  if (parsedQs.hasOwnProperty('error')) {
    err = {
      error: parsedQs.error, 
      errorDescription: parsedQs.error_description
    };

    if (parsedQs.state) {
      err.state = parsedQs.state;
    }

    return cb(err);
  }

  if (
    !parsedQs.hasOwnProperty('access_token') &&
    !parsedQs.hasOwnProperty('id_token') &&
    !parsedQs.hasOwnProperty('refresh_token')
  ) {
    return cb(null, null);
  }
  var responseTypes = (this.baseOptions.responseType || options.responseType || '').split(' ');
  if (
    responseTypes.length > 0 &&
    responseTypes.indexOf('token') !== -1 &&
    !parsedQs.hasOwnProperty('access_token')
  ) {
    return cb(
      {
        error: 'invalid_hash',
        errorDescription: 'response_type contains `token`, but the parsed hash does not contain an `access_token` property'
      }
    );
  }
  if (
    responseTypes.length > 0 &&
    responseTypes.indexOf('id_token') !== -1 &&
    !parsedQs.hasOwnProperty('id_token')
  ) {
    return cb(
      {
        error: 'invalid_hash',
        errorDescription: 'response_type contains `id_token`, but the parsed hash does not contain an `id_token` property'
      }
    );
  }
  return this.validateAuthenticationResponse(options, parsedQs, cb);
};

/**
 * Validates an Auth response from a Auth flow started with {@link authorize}
 *
 * Only validates id_tokens signed by Auth0 using the RS256 algorithm using the public key exposed
 * by the `/.well-known/jwks.json` endpoint of your account.
 * Tokens signed with the HS256 algorithm cannot be properly validated.
 * Instead, a call to {@link userInfo} will be made with the parsed `access_token`.
 * If the {@link userInfo} call fails, the {@link userInfo} error will be passed to the callback.
 * Tokens signed with other algorithms will not be accepted.
 *
 * @method validateAuthenticationResponse
 * @param {Object} options
 * @param {String} options.hash the url hash. If not provided it will extract from window.location.hash
 * @param {String} [options.state] value originally sent in `state` parameter to {@link authorize} to mitigate XSRF
 * @param {String} [options.nonce] value originally sent in `nonce` parameter to {@link authorize} to prevent replay attacks
 * @param {authorizeCallback} cb
 */
WebAuth.prototype.validateAuthenticationResponse = function(options, parsedHash, cb) {
  var _this = this;
  options.__enableIdPInitiatedLogin =
    options.__enableIdPInitiatedLogin || options.__enableImpersonation;
  var state = parsedHash.state;
  var transaction = this.transactionManager.getStoredTransaction(state);
  var transactionState = options.state || (transaction && transaction.state) || null;

  var transactionStateMatchesState = transactionState === state;
  var shouldBypassStateChecking = !state && !transactionState && options.__enableIdPInitiatedLogin;

  if (!shouldBypassStateChecking && !transactionStateMatchesState) {
    return cb({
      error: 'invalid_token',
      errorDescription: '`state` does not match.'
    });
  }
  var transactionNonce = options.nonce || (transaction && transaction.nonce) || null;

  var appState = options.state || (transaction && transaction.appState) || null;

  var callback = function(err, payload) {
    if (err) {
      return cb(err);
    }
    if (transaction && transaction.lastUsedConnection) {
      var sub;
      if (payload) {
        sub = payload.sub;
      }
      _this.ssodataStorage.set(transaction.lastUsedConnection, sub);
    }
    return cb(null, buildParseHashResponse(parsedHash, appState, payload));
  };

  if (!parsedHash.id_token) {
    return callback(null, null);
  }
  return this.validateToken(parsedHash.id_token, transactionNonce, function(
    validationError,
    payload
  ) {
    if (!validationError) {
      if (!parsedHash.access_token) {
        return callback(null, payload);
      }
      // id_token's generated by non-oidc applications don't have at_hash
      if (!payload.at_hash) {
        return callback(null, payload);
      }
      // here we're absolutely sure that the id_token's alg is RS256
      // and that the id_token is valid, so we can check the access_token
      return new IdTokenVerifier().validateAccessToken(
        parsedHash.access_token,
        'RS256',
        payload.at_hash,
        function(err) {
          if (err) {
            return callback({
              error: 'invalid_token',
              errorDescription: err.message
            });
          }
          return callback(null, payload);
        }
      );
    }
    if (validationError.error !== 'invalid_token') {
      return callback(validationError);
    }
    // if it's an invalid_token error, decode the token
    var decodedToken = new IdTokenVerifier().decode(parsedHash.id_token);
    // if the alg is not HS256, return the raw error
    if (decodedToken.header.alg !== 'HS256') {
      return callback(validationError);
    }
    if (!parsedHash.access_token) {
      var noAccessTokenError = {
        error: 'invalid_token',
        description:
          'The id_token cannot be validated because it was signed with the HS256 algorithm and public clients (like a browser) can’t store secrets. Please read the associated doc for possible ways to fix this. Read more: https://auth0.com/docs/errors/libraries/auth0-js/invalid-token#parsing-an-hs256-signed-id-token-without-an-access-token'
      };
      return callback(noAccessTokenError);
    }
    // if the alg is HS256, use the /userinfo endpoint to build the payload
    return _this.client.userInfo(parsedHash.access_token, function(errUserInfo, profile) {
      // if the /userinfo request fails, use the validationError instead
      if (errUserInfo) {
        return callback(errUserInfo);
      }
      return callback(null, profile);
    });
  });
};

function buildParseHashResponse(qsParams, appState, token) {
  return {
    accessToken: qsParams.access_token || null,
    idToken: qsParams.id_token || null,
    idTokenPayload: token || null,
    appState: appState || null,
    refreshToken: qsParams.refresh_token || null,
    state: qsParams.state || null,
    expiresIn: qsParams.expires_in ? parseInt(qsParams.expires_in, 10) : null,
    tokenType: qsParams.token_type || null,
    scope: qsParams.scope || null
  };
}

/**
 * Decodes the a JWT and verifies its nonce value
 *
 * @method validateToken
 * @private
 * @param {String} token
 * @param {String} nonce
 * @param {validateTokenCallback} cb
 */
WebAuth.prototype.validateToken = function(token, nonce, cb) {
  var verifier = new IdTokenVerifier({
    issuer: this.baseOptions.token_issuer,
    jwksURI: this.baseOptions.jwksURI,
    audience: this.baseOptions.clientID,
    leeway: this.baseOptions.leeway || 0,
    __disableExpirationCheck: this.baseOptions.__disableExpirationCheck
  });

  verifier.verify(token, nonce, function(err, payload) {
    if (err) {
      return cb({
        error: 'invalid_token',
        errorDescription: err.message
      });
    }

    cb(null, payload);
  });
};

/**
 * Executes a silent authentication transaction under the hood in order to fetch a new tokens for the current session.
 * This method requires that all Auth is performed with {@link authorize}
 * Watch out! If you're not using the hosted login page to do social logins, you have to use your own [social connection keys](https://manage.auth0.com/#/connections/social). If you use Auth0's dev keys, you'll always get `login_required` as an error when calling this method.
 *
 * @method renewAuth
 * @param {Object} [options]
 * @param {String} [options.clientID] the Client ID found on your Application settings page
 * @param {String} [options.redirectUri] url that the Auth0 will redirect after Auth with the Authorization Response
 * @param {String} [options.responseType] type of the response used by OAuth 2.0 flow. It can be any space separated list of the values `code`, `token`, `id_token`. {@link https://openid.net/specs/oauth-v2-multiple-response-types-1_0.html}
 * @param {String} [options.responseMode] how the Auth response is encoded and redirected back to the client. Supported values are `query`, `fragment` and `form_post`. The `query` value is only supported when `responseType` is `code`. {@link https://openid.net/specs/oauth-v2-multiple-response-types-1_0.html#ResponseModes}
 * @param {String} [options.state] value used to mitigate XSRF attacks. {@link https://auth0.com/docs/protocols/oauth2/oauth-state}
 * @param {String} [options.nonce] value used to mitigate replay attacks when using Implicit Grant. {@link https://auth0.com/docs/api-auth/tutorials/nonce}
 * @param {String} [options.scope] scopes to be requested during Auth. e.g. `openid email`
 * @param {String} [options.audience] identifier of the resource server who will consume the access token issued after Auth
 * @param {String} [options.postMessageDataType] identifier data type to look for in postMessage event data, where events are initiated from silent callback urls, before accepting a message event is the event expected. A value of false means any postMessage event will trigger a callback.
 * @param {String} [options.postMessageOrigin] origin of redirectUri to expect postMessage response from.  Defaults to the origin of the receiving window. Only used if usePostMessage is truthy.
 * @param {String} [options.timeout] value in milliseconds used to timeout when the `/authorize` call is failing as part of the silent authentication with postmessage enabled due to a configuration.
 * @param {Boolean} [options.usePostMessage] use postMessage to comunicate between the silent callback and the SPA. When false the SDK will attempt to parse the url hash should ignore the url hash and no extra behaviour is needed
 * @param {authorizeCallback} cb
 * @see {@link https://auth0.com/docs/api/authentication#authorize-client}
 */
WebAuth.prototype.renewAuth = function(options, cb) {
  var handler;
  var usePostMessage = !!options.usePostMessage;
  var postMessageDataType = options.postMessageDataType || false;
  var postMessageOrigin = options.postMessageOrigin || window.origin;
  var timeout = options.timeout;
  var _this = this;

  var params = objectHelper
    .merge(this.baseOptions, [
      'clientID',
      'redirectUri',
      'responseType',
      'scope',
      'audience',
      '_csrf',
      'state',
      '_intstate',
      'nonce'
    ])
    .with(options);

  params.responseType = params.responseType || 'token';
  params.responseMode = params.responseMode || 'fragment';
  params = this.transactionManager.process(params);

  assert.check(params, { type: 'object', message: 'options parameter is not valid' });
  assert.check(cb, { type: 'function', message: 'cb parameter is not valid' });

  params.prompt = 'none';

  params = objectHelper.blacklist(params, [
    'usePostMessage',
    'tenant',
    'postMessageDataType',
    'postMessageOrigin'
  ]);

  handler = SilentAuthenticationHandler.create({
    authenticationUrl: this.client.buildAuthorizeUrl(params),
    postMessageDataType: postMessageDataType,
    postMessageOrigin: postMessageOrigin,
    timeout: timeout
  });

  handler.login(usePostMessage, function(err, hash) {
    if (typeof hash === 'object') {
      // hash was already parsed, so we just return it.
      // it's here to be backwards compatible and should be removed in the next major version.
      return cb(err, hash);
    }
    _this.parseHash({ hash: hash }, cb);
  });
};

/**
 * Renews an existing session on Auth0's servers using `response_mode=web_message`
 *
 * @method checkSession
 * @param {Object} [options]
 * @param {String} [options.clientID] the Client ID found on your Application settings page
 * @param {String} [options.responseType] type of the response used by OAuth 2.0 flow. It can be any space separated list of the values `code`, `token`, `id_token`. {@link https://openid.net/specs/oauth-v2-multiple-response-types-1_0.html}
 * @param {String} [options.state] value used to mitigate XSRF attacks. {@link https://auth0.com/docs/protocols/oauth2/oauth-state}
 * @param {String} [options.nonce] value used to mitigate replay attacks when using Implicit Grant. {@link https://auth0.com/docs/api-auth/tutorials/nonce}
 * @param {String} [options.scope] scopes to be requested during Auth. e.g. `openid email`
 * @param {String} [options.audience] identifier of the resource server who will consume the access token issued after Auth
 * @param {String} [options.timeout] value in milliseconds used to timeout when the `/authorize` call is failing as part of the silent authentication with postmessage enabled due to a configuration.
 */
WebAuth.prototype.checkSession = function(options, cb) {
  var params = objectHelper
    .merge(this.baseOptions, [
      'clientID',
      'responseType',
      'redirectUri',
      'scope',
      'audience',
      '_csrf',
      'state',
      '_intstate',
      'nonce'
    ])
    .with(options);

  if (params.responseType === 'code') {
    return cb({ error: 'error', error_description: "responseType can't be `code`" });
  }

  if (!options.nonce) {
    params = this.transactionManager.process(params);
  }

  if (!params.redirectUri) {
    return cb({ error: 'error', error_description: "redirectUri can't be empty" });
  }

  assert.check(params, { type: 'object', message: 'options parameter is not valid' });
  assert.check(cb, { type: 'function', message: 'cb parameter is not valid' });

  params = objectHelper.blacklist(params, ['usePostMessage', 'tenant', 'postMessageDataType']);
  this.webMessageHandler.run(params, cb);
};

/**
 * Redirects to the auth0 logout endpoint
 *
 * If you want to navigate the user to a specific URL after the logout, set that URL at the returnTo parameter. The URL should be included in any the appropriate Allowed Logout URLs list:
 *
 * - If the client_id parameter is included, the returnTo URL must be listed in the Allowed Logout URLs set at the Auth0 Application level (see Setting Allowed Logout URLs at the App Level).
 * - If the client_id parameter is NOT included, the returnTo URL must be listed in the Allowed Logout URLs set at the account level (see Setting Allowed Logout URLs at the Account Level).
 *
 * @method logout
 * @param {Object} [options]
 * @param {String} [options.clientID] the Client ID found on your Application settings page
 * @param {String} [options.returnTo] URL to be redirected after the logout
 * @param {Boolean} [options.federated] tells Auth0 if it should logout the user also from the IdP.
 * @see   {@link https://auth0.com/docs/api/authentication#logout}
 */
WebAuth.prototype.logout = function(options) {
  window.location = this.client.buildLogoutUrl(options);
};

/**
 * Redirects to the hosted login page (`/authorize`) in order to start a new authN/authZ transaction.
 * After that, you'll have to use the {@link parseHash} function at the specified `redirectUri`.
 *
 * @method authorize
 * @param {Object} [options]
 * @param {String} [options.clientID] the Client ID found on your Application settings page
 * @param {String} options.redirectUri url that the Auth0 will redirect after Auth with the Authorization Response
 * @param {String} options.responseType type of the response used by OAuth 2.0 flow. It can be any space separated list of the values `code`, `token`, `id_token`. {@link https://openid.net/specs/oauth-v2-multiple-response-types-1_0.html}
 * @param {String} [options.responseMode] how the Auth response is encoded and redirected back to the client. Supported values are `query`, `fragment` and `form_post`. The `query` value is only supported when `responseType` is `code`. {@link https://openid.net/specs/oauth-v2-multiple-response-types-1_0.html#ResponseModes}
 * @param {String} [options.state] value used to mitigate XSRF attacks. {@link https://auth0.com/docs/protocols/oauth2/oauth-state}
 * @param {String} [options.nonce] value used to mitigate replay attacks when using Implicit Grant. {@link https://auth0.com/docs/api-auth/tutorials/nonce}
 * @param {String} [options.scope] scopes to be requested during Auth. e.g. `openid email`
 * @param {String} [options.audience] identifier of the resource server who will consume the access token issued after Auth
 * @see {@link https://auth0.com/docs/api/authentication#authorize-client}
 */
WebAuth.prototype.authorize = function(options) {
  var params = objectHelper
    .merge(this.baseOptions, [
      'clientID',
      'responseType',
      'responseMode',
      'redirectUri',
      'scope',
      'audience',
      '_csrf',
      'state',
      '_intstate',
      'nonce'
    ])
    .with(options);

  assert.check(
    params,
    { type: 'object', message: 'options parameter is not valid' },
    {
      responseType: { type: 'string', message: 'responseType option is required' }
    }
  );

  params = this.transactionManager.process(params);
  params.scope = params.scope || 'openid profile email';

  window.location = this.client.buildAuthorizeUrl(params);
};