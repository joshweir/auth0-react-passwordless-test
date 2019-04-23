import history from '../history';
import auth0 from 'auth0-js';
import { AUTH_CONFIG } from './auth0-variables';
const util = require('util');
require('util.promisify').shim();
const { promisify } = util;

export default class Auth {
  accessToken;
  idToken;
  expiresAt;
  tokenRenewalTimeout;

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
    this.getIdToken = this.getIdToken.bind(this);
    this.renewSession = this.renewSession.bind(this);
    this.auth0.passwordlessStart = promisify(this.auth0.passwordlessStart);
    this.auth0.passwordlessVerify = promisify(this.auth0.passwordlessVerify);
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

  async startMagicLinkEmail(email, stateToRetainOnCallback={}) {
    try {
      const response = await this.auth0.passwordlessStart({
        connection: 'email',
        send: 'link',
        email: email,
        authParams: {
          state: Buffer.from(JSON.stringify(stateToRetainOnCallback)).toString("base64")
        }
      });

      return {
        response,
        ok: true,
      };
    } catch(err) {
      console.warn('email magic link send error', err);
      return {
        ok: false,
        error: err
      };
    }
  }

  getParamFromHash(param, hash) {
    const paramElement = hash.replace(/^#/, '').split('&').map(function(p) {
      return p.split('=');
    }).filter(function(p) {
      return p[0] === param;
    });
    return paramElement.length > 0 ? paramElement[0][1] : '';
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

    // Set isLoggedIn flag in localStorage
    localStorage.setItem('isLoggedIn', 'true');
    localStorage.setItem('idTokenPayload', JSON.stringify(authResult.idTokenPayload));

    // schedule a token renewal
    this.scheduleRenewal();

    // navigate to the home route
    history.replace('/home');
  }

  renewSession() {
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

  logout() {
    // Remove tokens and expiry time
    this.accessToken = null;
    this.idToken = null;
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
}
