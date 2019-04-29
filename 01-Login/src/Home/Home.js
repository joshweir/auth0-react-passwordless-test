import React, { Component } from 'react';

class Home extends Component {
  constructor(props) {
    super(props);
    this.state = { 
      verifyCode: '', 
      showVerifyCode: false,
      magicLinkEmail: '',
      magicLinkSent: false,
      phoneNumber: '',
    };

    this.handleChangeSMSVerify = this.handleChangeSMSVerify.bind(this);
    this.keyPressSMSVerify = this.keyPressSMSVerify.bind(this);
    this.handleChangeEmail = this.handleChangeEmail.bind(this);
    this.keyPressEmail = this.keyPressEmail.bind(this);
    this.handleChangePhone = this.handleChangePhone.bind(this);
    this.keyPressPhone = this.keyPressPhone.bind(this);
  }

  handleChangeSMSVerify(evt) {
    this.setState({ verifyCode: evt.target.value });
  }

  keyPressSMSVerify(e){
    if(e.keyCode === 13 && this.state.verifyCode.length > 0){
      this.props.auth.verifySMSCode(this.state.verifyCode, this.state.phoneNumber);
    }
  }
  
  handleChangeEmail(evt) {
    this.setState({ magicLinkEmail: evt.target.value });
  }

  keyPressEmail(e){
    if(e.keyCode === 13 && this.state.magicLinkEmail.length > 0){
      this.props.auth.startMagicLinkEmail(this.state.magicLinkEmail);
      this.setState({ magicLinkSent: true });
    }
  }

  handleChangePhone(evt) {
    this.setState({ phoneNumber: evt.target.value });
  }

  keyPressPhone(e){
    if(e.keyCode === 13 && this.state.phoneNumber.length > 0){
      this.props.auth.loginUsingSMS(this.state.phoneNumber);
      this.setState({ showVerifyCode: true });
    }
  }

  login() {
    this.props.auth.login();
  }
  
  async loginUsingSMS(phoneNumber) {
    this.setState({ showVerifyCode: true });
    await this.props.auth.loginUsingSMS(phoneNumber);
  }

  render() {
    const { isAuthenticated, getExpiryDate, getAccessToken, getRefreshToken } = this.props.auth;
    return (
      <div className="container">
        {
          isAuthenticated() && (
              <div>
              <h4>
                You are logged in!
              </h4>
              <div>
                {localStorage.getItem('idTokenPayload')}
                <br /><br />state: <br />
                {localStorage.getItem('authState')}
                <br /><br />email from token:<br />
                <strong>{JSON.parse(localStorage.getItem('idTokenPayload'))['email']}</strong>
              </div>
              <h3>About Your Access Token</h3>
              <p>
                Your <code>access_token</code> (<code>{getAccessToken()}</code>) has an expiry date of:{' '}
                {getExpiryDate()}{' '}current date:{''}{JSON.stringify(new Date())}
              </p>
              <p>
                The token has been scheduled for renewal, but you can also renew it manually from the navbar
                if you don't want to wait. This manual renewal button is really
                just for demonstration and you probably won't want such a control
                in your actual application.
              </p>
              <p>Refresh token: {getRefreshToken()}</p>
              </div>
            )
        }
        {
          !isAuthenticated() && (
              <h4>
                You are not logged in! Please{' '}
                <a
                  style={{ cursor: 'pointer' }}
                  onClick={this.login.bind(this)}
                >
                  Log In
                </a>
                {' '}to continue.
              </h4>
            )
        }
        {
          !isAuthenticated() && (
            this.state.showVerifyCode ?
              <div>
                Enter the verification code sent to your phone:
                <input value={this.state.verifyCode} onKeyDown={this.keyPressSMSVerify} onChange={this.handleChangeSMSVerify} />
              </div> :
              <h4>
                Or submit mobile number to login using sms verify code{' '}
                <input value={this.state.phoneNumber} onKeyDown={this.keyPressPhone} onChange={this.handleChangePhone} />
                {' '}to continue.
              </h4>
            )
        }
        {
          !isAuthenticated() && (
            this.state.magicLinkSent ?
              <div>
                A magic link has been sent! Check your email..
              </div> :
              <h4>
                Or submit email for a magic link email{' '}
                <input value={this.state.magicLinkEmail} onKeyDown={this.keyPressEmail} onChange={this.handleChangeEmail} />
                {' '}to continue.
              </h4>
            )
        }
      </div>
    );
  }
}

export default Home;
