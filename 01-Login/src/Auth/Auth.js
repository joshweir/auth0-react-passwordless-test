import { confirmAuth0AccessToken } from '../server-fake/confirm-auth0-access-token';
import { refreshAccessToken } from '../server-fake/refresh-access-token';
import history from '../history';
import auth0 from 'auth0-js';
import { AUTH_CONFIG } from './auth0-variables';
const util = require('util');
require('util.promisify').shim();
const { promisify } = util;
const crypto = require('crypto');

export default class Auth {
  accessToken;
  idToken;
  expiresAt;
  tokenRenewalTimeout;
  refreshToken;

  auth0 = new auth0.WebAuth({
    domain: AUTH_CONFIG.domain,
    clientID: AUTH_CONFIG.clientId,
    redirectUri: AUTH_CONFIG.callbackUrl,
    responseType: 'token id_token',
    scope: 'openid name profile email picture phone'
  });

  constructor() {
    this.login = this.login.bind(this);
    this.logout = this.logout.bind(this);
    this.handleAuthentication = this.handleAuthentication.bind(this);
    this.isAuthenticated = this.isAuthenticated.bind(this);
    this.getAccessToken = this.getAccessToken.bind(this);
    this.getRefreshToken = this.getRefreshToken.bind(this);
    this.getIdToken = this.getIdToken.bind(this);
    this.renewSession = this.renewSession.bind(this);
    // this.auth0.passwordlessStart = promisify(this.auth0.passwordlessStart);
    // this.auth0.passwordlessVerify = promisify(this.auth0.passwordlessVerify);
    this.getExpiryDate = this.getExpiryDate.bind(this);
    this.scheduleRenewal();
  }

  login(state) {
    state ? 
      this.auth0.authorize({ state: state }) : 
      this.auth0.authorize();
  }

  // async loginUsingSMS(phoneNumber, stateToRetainOnCallback={}) {
  //   localStorage.setItem('authState', JSON.stringify(stateToRetainOnCallback));
  //   try {
  //     if (!phoneNumber) throw new Error('phone number is empty');
  //     const response = await this.auth0.passwordlessStart({
  //       connection: 'sms',
  //       send: 'code',
  //       phoneNumber: phoneNumber,
  //       authParams: {
  //         state: Buffer.from(JSON.stringify(stateToRetainOnCallback)).toString("base64")
  //       }
  //     });

  //     return {
  //       response,
  //       ok: true,
  //     };
  //   } catch(err) {
  //     console.warn('sms auth error', err);
  //     return {
  //       ok: false,
  //       error: err
  //     };
  //   }
  // }

  // async verifySMSCode(verifyCode, phoneNumber) {
  //   try {
  //     const response = await this.auth0.passwordlessVerify({
  //       connection: 'sms',
  //       phoneNumber: phoneNumber,
  //       verificationCode: verifyCode
  //     });

  //     return {
  //       response,
  //       ok: true,
  //     }
  //   } catch(err) {
  //     console.warn('sms verify error', err);
  //     return {
  //       ok: false,
  //       error: err
  //     };
  //   }
  // }

  async startMagicLinkEmail(email, responseType, stateToRetainOnCallback={}) {
    const verifier = this.base64URLEncode(crypto.randomBytes(32));
    localStorage.setItem('code_verifier', verifier);
    const challenge = this.base64URLEncode(this.sha256(verifier));
    try {
      const body = {
        email,
        client_id: AUTH_CONFIG.clientId,
        connection: 'email',
        send: 'link',
        authParams: {
          state: Buffer.from(JSON.stringify(stateToRetainOnCallback)).toString("base64"),
          redirect_uri: AUTH_CONFIG.callbackUrl,
          response_type: responseType,
          scope: 'openid name profile email picture phone offline_access',
          nonce: 'thisshouldberandom',
        }
      }
      if (responseType === 'code') {
        body.authParams = { ...body.authParams, ...{
          audience: `${AUTH_CONFIG.apiEndpoint}/userinfo`,
          code_challenge_method: 'S256',
          code_challenge: challenge,
        }}
      }
      const response = await fetch(`${AUTH_CONFIG.apiEndpoint}/passwordless/start`, { 
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(body),
      });
      if (!response.ok) {
        throw new Error(`sending email login link failed: \n` +
          `http status: ${response.status} statusText: ${response.statusText} response: ${JSON.stringify(await response.json())}`);
      }
      return {
        ok: true,
        response: await response.json(),
      };
    } catch(err) {
      console.warn('email magic link send error', err);
      return {
        ok: false,
        error: err
      };
    }
  }

  handleAuthentication(hash) {
    localStorage.setItem(`handleAuth|${Date.now()}`, this.getParamFromHash('state', decodeURIComponent(hash)));
    this.auth0.parseHash(async (err, authResult) => {
      if (authResult && authResult.accessToken && authResult.idToken) {
        await this.persistAuthStateIfNotYetDefined(authResult.state);
        this.setSession(authResult);
      } else if (err) {
        // when a magic link auth link is clicked, the parseHash fails with invalid_hash, 
        // however if call auth0.authorize again this will immediately call back authorized
        if (/(invalid_hash|invalid_token)/.test(err.error)) {
          const stateFromHash = this.getParamFromHash('state', decodeURIComponent(hash));
          console.log('relogin', err.description, err, stateFromHash);
          this.login(stateFromHash);
        } else {
          history.replace('/home');
          console.log(err);
          alert(`Error: ${err.error}. Check the console for further details.`);
        }
      }
    });
  }

  getAccessToken() {
    return this.accessToken;
  }

  getRefreshToken() {
    return localStorage.getItem('refreshToken');
  }

  getIdToken() {
    return this.idToken;
  }

  async persistAuthStateIfNotYetDefined(authResultState) {
    let authState = JSON.parse(localStorage.getItem('authState'));
    if (!authState) {
      try {
        authState = JSON.parse((new Buffer(decodeURIComponent(authResultState), 'base64')).toString());
      } catch(e) {
        console.log('authState is not json, do not store', e, authResultState);
      }
      if (authState && (authState['email'] || authState['phone'])) {
        localStorage.setItem('authState', JSON.stringify(authState));
      }
    }

    return JSON.parse(localStorage.getItem('authState'));
  }

  async setSession(authResult) {
    // Set the time that the access token will expire at
    let expiresAt = (authResult.expiresIn * 1000) + new Date().getTime();
    this.accessToken = authResult.accessToken;
    this.idToken = authResult.idToken;
    this.expiresAt = expiresAt;
    if (authResult.refreshToken) {
      localStorage.setItem('refreshToken', authResult.refreshToken);
    }
    // Set isLoggedIn flag in localStorage
    localStorage.setItem('isLoggedIn', 'true');
    localStorage.setItem('idTokenPayload', JSON.stringify(authResult.idTokenPayload));

    // schedule a token renewal
    await this.scheduleRenewal();

    // navigate to the home route
    history.replace('/home');
  }

  async renewSession() {
    const refreshToken = localStorage.getItem('refreshToken');
    if (refreshToken) {
      const authResult = await this.buildAuthResultFromOauthResponse(await refreshAccessToken(refreshToken));
      if (authResult && authResult.accessToken && authResult.idToken) {
        this.setSession(authResult);
      } else {
        console.log(`Unexpected authResult refreshing access token: ${JSON.stringify(authResult)}`);
        alert(`Error: Unexpected authResult. Check the console for further details.`);
      }
    } else {
      this.auth0.checkSession({}, (err, authResult) => {
        if (authResult && authResult.accessToken && authResult.idToken) {
          this.setSession(authResult);
        } else if (err) {
          // this.logout();
          console.log(err);
          alert(`Could not get a new token (${err.error}: ${err.error_description}).`);
        }
      });
    }
  }

  logout() {
    // Remove tokens and expiry time
    this.accessToken = null;
    this.idToken = null;
    localStorage.removeItem('refreshToken');
    this.expiresAt = 0;
 
    // Clear token renewal
    clearTimeout(this.tokenRenewalTimeout);

    // Remove isLoggedIn flag from localStorage
    localStorage.removeItem('isLoggedIn');
    localStorage.removeItem('authState');
    localStorage.removeItem('idTokenPayload');

    this.auth0.logout({
      return_to: window.location.origin
    });

    // navigate to the home route
    history.replace('/home');
  }

  isAuthenticated() {
    // Check whether the current time is past the
    // access token's expiry time
    let expiresAt = this.expiresAt;
    return new Date().getTime() < expiresAt;
  }

  scheduleRenewal() {
    let expiresAt = this.expiresAt;
    const timeout = expiresAt - Date.now();
    if (timeout > 0) {
      this.tokenRenewalTimeout = setTimeout(() => {
        this.renewSession();
      }, timeout);
    }
  }

  getExpiryDate() {
    return JSON.stringify(new Date(this.expiresAt));
  }




  // async getRefreshToken() {
  //   const verifier = this.base64URLEncode(crypto.randomBytes(32));
  //   localStorage.setItem('code_verifier', verifier);
  //   const challenge = this.base64URLEncode(this.sha256(verifier));
  //   try {
  //     const params = {
  //       audience: `${AUTH_CONFIG.apiEndpoint}/userinfo`,
  //       scope: 'openid name profile email picture phone offline_access', 
  //       response_type: 'code', 
  //       client_id: AUTH_CONFIG.clientId,
  //       redirect_uri: AUTH_CONFIG.callbackUrl, 
  //       state: Buffer.from(JSON.stringify({ seeif: 'this state is retained' })).toString("base64"),
  //       code_challenge_method: 'S256',
  //       code_challenge: challenge,
  //     };
  //     const query = Object.keys(params).map(k => `${encodeURIComponent(k)}=${encodeURIComponent(params[k])}`).join('&');
  //     const response = await fetch(`${AUTH_CONFIG.apiEndpoint}/authorize?${query}`);
  //     if (!response.ok) {
  //       throw new Error(`requesting refresh token failed: \n` +
  //         `http status: ${response.status} statusText: ${response.statusText} response: ${JSON.stringify(await response.json())}`);
  //     }
  //     return {
  //       ok: true,
  //       response: await response.json(),
  //     };
  //   } catch(err) {
  //     console.warn('requesting refresh token failed', err);
  //     return {
  //       ok: false,
  //       error: err
  //     };
  //   }
  // }

  base64URLEncode(str) {
    return str.toString('base64')
        .replace(/\+/g, '-')
        .replace(/\//g, '_')
        .replace(/=/g, '');
  }

  sha256(buffer) {
    return crypto.createHash('sha256').update(buffer).digest();
  }

  async handleRefreshCodeCallback(search) {
    const code = this.getParamFromSearch('code', search);
    const authState = this.getParamFromSearch('state', search);
    await this.persistAuthStateIfNotYetDefined(authState);
    try {
      if (!code) throw new Error('url did not contain code param: ' + search);
      const response = await fetch(`${AUTH_CONFIG.apiEndpoint}/oauth/token`, { 
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          code,
          grant_type: 'authorization_code',
          client_id: AUTH_CONFIG.clientId,
          code_verifier: localStorage.getItem('code_verifier'),
          redirect_uri: AUTH_CONFIG.callbackUrl
        }),
      });
      if (!response.ok) {
        throw new Error(`refresh code call failed: \n` +
          `http status: ${response.status} statusText: ${response.statusText} response: ${JSON.stringify(await response.json())}`);
      }

      const authResult = await this.buildAuthResultFromOauthResponse(await response.json());
      if (authResult && authResult.accessToken && authResult.idToken && authResult.refreshToken) {
        this.setSession(authResult);
      } else {
        console.log(`Unexpected authResult: ${JSON.stringify(authResult)}`);
        alert(`Error: Unexpected authResult. Check the console for further details.`);
      }
      // localStorage.setItem('refresh_code_response', JSON.stringify(await response.json()));
    } catch(err) {
      console.warn('refresh code call failed', err);
    }
  }

  async buildAuthResultFromOauthResponse(response) {
    const result = {
      accessToken: response.access_token,
      expiresIn: response.expires_in,
      idToken: response.id_token,
      idTokenPayload: await confirmAuth0AccessToken(response.access_token),
      scope: response.scope,
      tokenType: response.token_type,
    }

    if (response.refresh_token) {
      result.refreshToken = response.refresh_token;
    }

    return result;
  }

  getParamFromHash(param, hash) {
    const paramElement = hash.replace(/^#/, '').split('&').map(function(p) {
      return p.split('=');
    }).filter(function(p) {
      return p[0] === param;
    });
    return paramElement.length > 0 ? paramElement[0][1] : '';
  }

  getParamFromSearch(param, search) {
    const paramElement = search.replace(/^\?/, '').split('&').map(function(p) {
      return p.split('=');
    }).filter(function(p) {
      return p[0] === param;
    });
    return paramElement.length > 0 ? paramElement[0][1] : '';
  };
}
