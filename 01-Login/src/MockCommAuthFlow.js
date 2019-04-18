import React, { Component } from 'react';
import { simulateBackendCreateConvUserIdentifierAndUserClickingEmailLink } from './server-fake/simulate-backend-create-conv-user-identifier-and-user-clicking-email-link';
import { Button } from 'react-bootstrap';
import { JOSH_TEMP_CONFIG } from './Auth/auth0-variables'
import { stripPhoneNumber } from './common-util/strip-phone-number';
import { verifyAndUpdateUserPhone } from './server-fake/verify-and-update-user-phone';
import { basicEmailValidation } from './common-util/basic-email-validation';

const STEP_NEW_PARTICIPANT_EVENT_OR_HOME_PAGE = 0;
const STEP_MOCK_PARTICIPANT_DATA = 1;
const STEP_USER_CLICKED_EMAIL_LINK = 2;
const STEP_MOCK_USER_NAV_HOME_PAGE_DIRECT = 3;
const STEP_EMAIL_MAGIC_LINK_SENT = 4;
const STEP_FROM_EMAIL_MAGIC_LINK = 5;

class MockCommAuthFlow extends Component {
  constructor(props) {
    super(props);
    this.state = {
      step: props.location && props.location.state && props.location.state.emailBasedAccessToken ? 
        STEP_FROM_EMAIL_MAGIC_LINK : STEP_NEW_PARTICIPANT_EVENT_OR_HOME_PAGE,
      email: props.location && props.location.state && props.location.state.email ? 
        props.location.state.email : JOSH_TEMP_CONFIG.email,
      phone: props.location && props.location.state && props.location.state.phone ? 
        props.location.state.phone : null,
      emailBasedAccessToken: props.location && props.location.state && props.location.state.emailBasedAccessToken ? 
        props.location.state.emailBasedAccessToken : null,
      userStoredPhone: JOSH_TEMP_CONFIG.phone_number,
      passwordlessMethod: null,
      showVerifyCode: null,
      smsVerifyError: '',
      verifyCode: '',
      magicUserIdentifier: null,
      conversationUri: '',
      userEnteredPhone: '',
      userEnteredPhoneError: '',
      userEnteredEmail: '',
      userEnteredEmailError: '',
    }
  }

  async handleSubmitParticipantData() {
    if(this.state.email.length > 0 && this.state.conversationUri.length > 0){
      // mock the fact that the userStoredPhone would already be stored against the user in db
      if (this.state.userStoredPhone.toString().length > 0) {
        localStorage.setItem(`userPhone|${this.state.email}`, this.state.userStoredPhone);
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
        const { ok, error } = await this.props.auth.loginUsingSMS(phone, {
          phone,
          magicUserIdentifier,
          email: this.state.email,
          method: 'sms',
        });
        if (!ok) {
          this.setState({ userEnteredPhoneError: error ? error.description : '' })
        }
      }
    }
  }

  async keyPressUserEnteredPhone(e){
    TODO: update this based on emailBasedAccessToken
    if(e.keyCode === 13 && this.state.userEnteredPhone.length > 0){
      const { phone, error } = await verifyAndUpdateUserPhone({
        phone: this.state.userEnteredPhone,
        userConversationIdentifier: this.state.magicUserIdentifier,
        emailBasedAccessToken: this.state.emailBasedAccessToken,
      });
      if (!!phone) {
        const { ok, error } = await this.props.auth.loginUsingSMS(phone, {
          phone,
          email: this.state.email,
          method: 'sms',
          magicUserIdentifier: this.state.magicUserIdentifier,
        });
        if (!ok) {
          this.setState({ userEnteredPhoneError: error ? error.description : '' })
        } else {
          this.setState({ phone })
        }
      } else {
        this.setState({ userEnteredPhoneError: error ? error.description : '' });
      };
    }
  }

  async handleChangeSMSVerify(evt) {
    TODO: update this based on emailBasedAccessToken
    this.setState({ verifyCode: evt.target.value });
    if (evt.target.value.length >= 6) {
      const result = await this.props.auth.verifySMSCode(evt.target.value, this.state.phone);
      this.setState({ smsVerifyError: result.error ? result.error.description : '' })
    }
  }

  keyPressSMSVerify(e) {
    TODO: update this based on emailBasedAccessToken?
    if(e.keyCode === 13 && this.state.verifyCode.length > 0){
      const result = this.props.auth.verifySMSCode(this.state.verifyCode, this.state.phone);
      this.setState({ smsVerifyError: result.error ? result.error.description : '' })
    } else {
      this.setState({ smsVerifyError: '' });
    }
  }

  async changeUserEnteredEmail(e) {
    const emailValid = basicEmailValidation(e.target.value);
    this.setState({ 
      userEnteredEmail: e.target.value,
      userEnteredEmailError: emailValid ? '' : 'Please enter a valid email address',
    });
  }

  async keyPressUserEnteredEmail(e) {
    if(e.keyCode === 13 && this.state.userEnteredEmail.length > 0){
      const emailValid = basicEmailValidation(this.state.userEnteredEmail);
      if (emailValid) {
        const result = this.props.auth.startMagicLinkEmail(this.state.userEnteredEmail, {
          email: this.state.userEnteredEmail,
          method: 'email',
        });
        this.setState({
          userEnteredEmailError: result.error ? result.error.description : '',
          step: result.error ? this.state.step : STEP_EMAIL_MAGIC_LINK_SENT,
        })
      } else {
        this.setState({
          userEnteredEmailError: 'Please enter a valid email address'
        })
      }
    }
  }

  render() {
    const { isAuthenticated } = this.props.auth;
    const { step, phone } = this.state;
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
                  this.setState({ 
                    conversationUri: JOSH_TEMP_CONFIG.conversationUri,
                    step: STEP_MOCK_USER_NAV_HOME_PAGE_DIRECT,
                  });
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
              !!phone && !this.state.userEnteredPhoneError ? (
                <div>
                  <div>Enter the verification code sent to your phone {
                    phone.slice(0,4) + (new Array(phone.slice(5,-2).length)).join('*') + phone.slice(-2)
                  }</div>
                  <input 
                    value={this.state.verifyCode} 
                    onKeyDown={this.keyPressSMSVerify.bind(this)} 
                    onChange={this.handleChangeSMSVerify.bind(this)} 
                  />
                  {this.state.smsVerifyError && 
                    <div>{this.state.smsVerifyError}</div>
                  }
                </div>
              ) : (
                <div>
                  <div>Enter your mobile phone number, we will send you a verification code to log you in</div>
                  <input 
                    value={this.state.userEnteredPhone} 
                    onKeyDown={this.keyPressUserEnteredPhone.bind(this)} 
                    onChange={(evt) => this.setState({ userEnteredPhone: stripPhoneNumber(evt.target.value) })} 
                  />
                  {this.state.userEnteredPhoneError && 
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
        {
          !isAuthenticated() && step === STEP_MOCK_USER_NAV_HOME_PAGE_DIRECT && (
            <div>
              <p>Enter your email:</p>
              <input 
                value={this.state.userEnteredEmail} 
                onKeyDown={this.keyPressUserEnteredEmail.bind(this)} 
                onChange={this.changeUserEnteredEmail.bind(this)} 
                placeholder="enter email.."
              />
              {this.state.userEnteredEmailError && 
                <div>{this.state.userEnteredEmailError}</div>
              }
            </div>
          )
        }
        {
          !isAuthenticated() && step === STEP_EMAIL_MAGIC_LINK_SENT && (
            <div>
              <p>An email with a magic login link has been sent to {this.state.userEnteredEmail}, please check your email..</p>
            </div>
          )
        }
        {
          !isAuthenticated() && step === STEP_FROM_EMAIL_MAGIC_LINK && (
            <div>
            {
              !!phone && !this.state.userEnteredPhoneError ? (
                <div>
                  <div>Enter the verification code sent to your phone {
                    phone.slice(0,4) + (new Array(phone.slice(5,-2).length)).join('*') + phone.slice(-2)
                  }</div>
                  <input 
                    value={this.state.verifyCode} 
                    onKeyDown={this.keyPressSMSVerify.bind(this)} 
                    onChange={this.handleChangeSMSVerify.bind(this)} 
                  />
                  {this.state.smsVerifyError && 
                    <div>{this.state.smsVerifyError}</div>
                  }
                </div>
              ) : (
                <div>
                  <div>Enter your mobile phone number, we will send you a verification code to log you in</div>
                  <input 
                    value={this.state.userEnteredPhone} 
                    onKeyDown={this.keyPressUserEnteredPhone.bind(this)} 
                    onChange={(evt) => this.setState({ userEnteredPhone: stripPhoneNumber(evt.target.value) })} 
                  />
                  {this.state.userEnteredPhoneError && 
                    <div>{this.state.userEnteredPhoneError}</div>
                  }
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
