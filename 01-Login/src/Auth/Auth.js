import history from '../history';
import auth0 from 'auth0-js';
import { AUTH_CONFIG, JOSH_TEMP_CONFIG } from './auth0-variables';

export default class Auth {
  accessToken;
  idToken;
  expiresAt;

  auth0 = new auth0.WebAuth({
    domain: AUTH_CONFIG.domain,
    clientID: AUTH_CONFIG.clientId,
    redirectUri: AUTH_CONFIG.callbackUrl,
    responseType: 'token id_token',
    scope: 'openid'
  });

  constructor() {
    this.login = this.login.bind(this);
    this.logout = this.logout.bind(this);
    this.handleAuthentication = this.handleAuthentication.bind(this);
    this.isAuthenticated = this.isAuthenticated.bind(this);
    this.getAccessToken = this.getAccessToken.bind(this);
    this.getIdToken = this.getIdToken.bind(this);
    this.renewSession = this.renewSession.bind(this);
  }

  login(state) {
    state ? 
      this.auth0.authorize({ state: state }) : 
      this.auth0.authorize();
  }

  loginUsingSMS(state) {
    this.auth0.passwordlessStart({
      connection: 'sms',
      send: 'code',
      phoneNumber: JOSH_TEMP_CONFIG.phone_number,
    }, function (err,res) {
      if (err) {
        console.error('sms auth error', err.toString());
      }
      console.log('sms auth callback', res);
    })
  }

  verifySMSCode(verifyCode) {
    this.auth0.passwordlessVerify({
      connection: 'sms',
      phoneNumber: JOSH_TEMP_CONFIG.phone_number,
      verificationCode: verifyCode
    }, function (err,res) {
      if (err) {
        console.error('sms verify code error', err.toString());
      }
      console.log('sms verify callback', res);
    });
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
    this.auth0.parseHash((err, authResult) => {
      console.log('parsed hash', authResult, 'err:', err);
      if (authResult && authResult.accessToken && authResult.idToken) {
        this.setSession(authResult);
      } else if (err) {
        // when a magic link auth link is clicked, the parseHash fails with invalid_hash, 
        // however if call auth0.authorize again this will immediately call back authorized
        if (/invalid_hash/.test(err.error)) {
          const stateFromHash = this.getParamFromHash('state', hash);
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

  setSession(authResult) {
    // Set isLoggedIn flag in localStorage
    localStorage.setItem('isLoggedIn', 'true');

    // Set the time that the access token will expire at
    let expiresAt = (authResult.expiresIn * 1000) + new Date().getTime();
    this.accessToken = authResult.accessToken;
    this.idToken = authResult.idToken;
    this.expiresAt = expiresAt;

    // navigate to the home route
    history.replace('/home');
  }

  renewSession() {
    this.auth0.checkSession({}, (err, authResult) => {
       if (authResult && authResult.accessToken && authResult.idToken) {
         this.setSession(authResult);
       } else if (err) {
         this.logout();
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

    // Remove isLoggedIn flag from localStorage
    localStorage.removeItem('isLoggedIn');

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
}
