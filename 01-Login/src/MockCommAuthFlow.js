import React, { Component } from 'react';
import { createBaseAuth0UserAndSha1UserIdentifier } from './server-fake/create-base-auth0-user-and-sha1-user-identifier';
import { Button } from 'react-bootstrap';
import { JOSH_TEMP_CONFIG } from './Auth/auth0-variables'

const STEP_SERVER_SIM_CREATE_PARTICIPANT_IN_AUTH0 = 0;
const STEP_MOCK_EMAIL_BUTTONS = 1;

class MockCommAuthFlow extends Component {
  constructor(props) {
    super(props);
    this.state = {
      step: STEP_SERVER_SIM_CREATE_PARTICIPANT_IN_AUTH0,
      email: JOSH_TEMP_CONFIG.email,
      phone: JOSH_TEMP_CONFIG.phone_number,
      passwordlessMethod: null,
      showVerifyCode: null,
      smsVerifyError: '',
      verifyCode: '',
      magicUserIdentifier: null,
    }
  }

  nextStep() {
    this.setState((prevState) => ({ step: prevState.step + 1 }));
  }

  handleChangeEmail(evt) {
    this.setState({ email: evt.target.value });
  }

  async keyPressEmail(e){
    if(e.keyCode === 13 && this.state.email.length > 0){
      this.setState({ magicUserIdentifier: await createBaseAuth0UserAndSha1UserIdentifier(this.state.email, this.state.phone) });
      this.nextStep();
    }
  }

  async handleChangeSMSVerify(evt) {
    this.setState({ verifyCode: evt.target.value });
    if (evt.target.value.length >= 6) {
      const result = await this.props.auth.verifySMSCode(evt.target.value, this.state.phone);
      this.setState({ smsVerifyError: result.error ? result.error : '' })
    }
  }

  keyPressSMSVerify(e){
    if(e.keyCode === 13 && this.state.verifyCode.length > 0){
      this.props.auth.verifySMSCode(this.state.verifyCode, this.state.phone);
    }
  }

  render() {
    const { isAuthenticated } = this.props.auth;
    const { step, passwordlessMethod, showVerifyCode } = this.state;
    return (
      <div className="container">
        {
          isAuthenticated() && (
            <h4>
              You are logged in!
            </h4>
          )
        }
        {
          !isAuthenticated() && step === STEP_SERVER_SIM_CREATE_PARTICIPANT_IN_AUTH0 && (
            <div>
              <h4>Step #{step + 1}</h4>
              <p>Enter the email of participant to create base auth0 account:</p>
              <input 
                value={this.state.phone} 
                onChange={(evt) => this.setState({ phone: evt.target.value })} 
                placeholder="enter mobile phone +61421.." 
              />
              <input 
                value={this.state.email} 
                onKeyDown={this.keyPressEmail.bind(this)} 
                onChange={this.handleChangeEmail.bind(this)} 
                placeholder="enter email then enter.."
              />
            </div>
          )
        }
        {
          !isAuthenticated() && step === STEP_MOCK_EMAIL_BUTTONS && (
            <div>
              <h4>Step #{step + 1}</h4>
              { 
                passwordlessMethod && passwordlessMethod === 'email' && (
                  <div>
                    A magic link has been sent! Check your email {this.state.email}..
                  </div>
                ) 
              }
              { 
                passwordlessMethod && passwordlessMethod === 'phone' && showVerifyCode && (
                  <div>
                    Enter the verification code sent to your phone:
                    <input 
                      value={this.state.verifyCode} 
                      onKeyDown={this.keyPressSMSVerify.bind(this)} 
                      onChange={this.handleChangeSMSVerify.bind(this)} 
                    />
                    {this.state.smsVerifyError.length > 0 && 
                      <div>{this.state.smsVerifyError}</div>
                    }
                  </div>
                ) 
              }
              { 
                !passwordlessMethod && (
                  <div>
                    <p>Mock email buttons:</p>
                    <Button
                      bsStyle="primary"
                      className="btn-margin"
                      onClick={() => {
                        this.setState({ passwordlessMethod: 'phone' });
                        this.props.auth.loginUsingSMS(this.state.phone, {
                          phone: this.state.phone,
                          email: this.state.email,
                          method: 'sms',
                          magicUserIdentifier: this.state.magicUserIdentifier,
                        });
                        this.setState({ showVerifyCode: true });
                      }}
                    >
                      User has phone number
                    </Button>
                    <Button
                      bsStyle="primary"
                      className="btn-margin"
                      onClick={() => {
                        this.setState({ passwordlessMethod: 'email' });
                        this.props.auth.startMagicLinkEmail(this.state.email, {
                          phone: this.state.phone,
                          email: this.state.email,
                          method: 'email',
                          magicUserIdentifier: this.state.magicUserIdentifier,
                        });
                      }}
                    >
                      User has only email
                    </Button>
                  </div>
                ) 
              }
            </div>
          )
        }
      </div>
    )
  }
}

export default MockCommAuthFlow;
