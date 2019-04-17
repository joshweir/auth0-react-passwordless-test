import React, { Component } from 'react';
import { simulateBackendCreateConvUserIdentifierAndUserClickingEmailLink } from './server-fake/simulate-backend-create-conv-user-identifier-and-user-clicking-email-link';
import { Button } from 'react-bootstrap';
import { JOSH_TEMP_CONFIG } from './Auth/auth0-variables'

const STEP_NEW_PARTICIPANT_EVENT_OR_HOME_PAGE = 0;
const STEP_MOCK_PARTICIPANT_DATA = 1;
const STEP_USER_CLICKED_EMAIL_LINK = 2;

class MockCommAuthFlow extends Component {
  constructor(props) {
    super(props);
    this.state = {
      step: STEP_NEW_PARTICIPANT_EVENT_OR_HOME_PAGE,
      email: JOSH_TEMP_CONFIG.email,
      userStoredPhone: JOSH_TEMP_CONFIG.phone_number,
      passwordlessMethod: null,
      showVerifyCode: null,
      smsVerifyError: '',
      verifyCode: '',
      magicUserIdentifier: null,
      conversationUri: '',
    }
  }

  async handleChangeSMSVerify(evt) {
    this.setState({ verifyCode: evt.target.value });
    if (evt.target.value.length >= 6) {
      const result = await this.props.auth.verifySMSCode(evt.target.value, this.state.phone);
      this.setState({ smsVerifyError: !!result.error ? result.error : '' })
    }
  }

  keyPressSMSVerify(e){
    if(e.keyCode === 13 && this.state.verifyCode.length > 0){
      this.props.auth.verifySMSCode(this.state.verifyCode, this.state.phone);
    }
  }

  async handleSubmitParticipantData() {
    if(this.state.email.length > 0 && this.state.conversationUri.length > 0){
      // mock the fact that the userStoredPhone would already be stored against the user in db
      if (this.state.userStoredPhone.toString().length > 0) {
        localStorage.setItem(`userPhone|${this.state.email}`, JSON.stringify(this.state.userStoredPhone));
      }

      const { magicUserIdentifier, phone } = await simulateBackendCreateConvUserIdentifierAndUserClickingEmailLink(
        this.state.email, 
        this.state.conversationUri,
      );
      this.setState({
        magicUserIdentifier,
        phone,
        step: STEP_USER_CLICKED_EMAIL_LINK,
        showVerifyCode: !!phone,
      });
      if (!!phone) {
        this.props.auth.loginUsingSMS(phone, {
          phone,
          magicUserIdentifier,
          email: this.state.email,
          method: 'sms',
        });
      }
    }
  }

  render() {
    const { isAuthenticated } = this.props.auth;
    const { step, passwordlessMethod, showVerifyCode, phone } = this.state;
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
          !isAuthenticated() && step === STEP_NEW_PARTICIPANT_EVENT_OR_HOME_PAGE && (
            <div>
              <h4>Step #{step + 1}</h4>
              <Button
                bsStyle="primary"
                className="btn-margin"
                onClick={() => {
                  this.setState({ 
                    conversationUri: JOSH_TEMP_CONFIG.conversationUri,
                    step: STEP_MOCK_PARTICIPANT_DATA,
                  });
                }}
              >
                Add Conversation Participant Event
              </Button>
              or
              <Button
                bsStyle="primary"
                className="btn-margin"
                onClick={() => {

                }}
              >
                User lands on app root page
              </Button>
            </div>
          )
        }
        {/*
          MOCKING clicking email link flow...
        */}
        {
          !isAuthenticated() && step === STEP_MOCK_PARTICIPANT_DATA && (
            <div>
              <h4>Step #{step + 1}</h4>
              <p>This is the participant event data:</p>
              <input 
                value={this.state.conversationUri} 
                onChange={(evt) => this.setState({ conversationUri: evt.target.value })} 
                placeholder="enter email.."
              />
              <input 
                value={this.state.email} 
                onChange={(evt) => this.setState({ email: evt.target.value })} 
                placeholder="enter email.."
              />
              <p>Optionally, enter the mobile phone number that will assume that phone number existed against the user:</p>
              <input 
                value={this.state.userStoredPhone} 
                onChange={(evt) => this.setState({ userStoredPhone: evt.target.value })} 
                placeholder="optionally enter mobile phone +61421.." 
              />
              <Button
                bsStyle="primary"
                className="btn-margin"
                onClick={this.handleSubmitParticipantData.bind(this)}
              >
                Submit
              </Button>
            </div>
          )
        }
        {
          !isAuthenticated() && step === STEP_USER_CLICKED_EMAIL_LINK && (
            <div>
            {
              !!phone ? (
                <div>
                  <div>Enter the verification code sent to your phone {
                    phone.slice(0,4) + (new Array(phone.slice(5,-2).length)).join('*') + phone.slice(-2)
                  }</div>
                  <input 
                    value={this.state.verifyCode} 
                    onKeyDown={this.keyPressSMSVerify.bind(this)} 
                    onChange={this.handleChangeSMSVerify.bind(this)} 
                  />
                  {this.state.smsVerifyError.length > 0 && 
                    <div>{this.state.smsVerifyError}</div>
                  }
                </div>
              ) : (
                <div>
                  <div>Enter your mobile phone number, we will send you a verification code to log you in</div>
                  <input 
                    value={this.state.userEnteredPhone} 
                    onKeyDown={this.keyPressUserEnteredPhone.bind(this)} 
                    onChange={this.handleChangeUserEnteredPhone.bind(this)} 
                  />
                  {this.state.userEnteredPhoneError.length > 0 && 
                    <div>{this.state.userEnteredPhoneError}</div>
                  }
                </div>
              )
            }
            </div>
          )
        }
        {/*
          MOCKING user navs to landing page direct flow...
        */}
        { /* This step is unused, leaving here until i use all the bits from it above.. */
          !isAuthenticated() && step === -1 && (
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
