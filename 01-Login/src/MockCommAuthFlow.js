import React, { Component } from 'react';
import { Button } from 'react-bootstrap';
import { JOSH_TEMP_CONFIG } from './Auth/auth0-variables'
import { basicEmailValidation } from './common-util/basic-email-validation';

const STEP_NEW_PARTICIPANT_EVENT_OR_HOME_PAGE = 0;
const STEP_MOCK_PARTICIPANT_DATA = 1;
const STEP_MOCK_PROTECTED_PAGE = 3;
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
      userConversationIdentifier: null,
      conversationUri: '',
      userEnteredPhone: '',
      userEnteredPhoneError: '',
      userEnteredEmail: '',
      userEnteredEmailError: '',
    }
  }

  async startMagicLinkEmail(email) {
    const result = this.props.auth.startMagicLinkEmail(email, {
      email,
      conversationUri: this.state.conversationUri,
    });
    this.setState({
      userEnteredEmailError: result.error ? result.error.description : '',
      step: result.error ? this.state.step : STEP_EMAIL_MAGIC_LINK_SENT,
    })
  }

  async handleSubmitParticipantData() {
    if(this.state.conversationUri.length > 0){
      this.setState({
        step: STEP_MOCK_PROTECTED_PAGE,
      });
      if (this.state.email.length > 0) {
        this.startMagicLinkEmail(this.state.email);
      }
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
        this.setState({ email: this.state.userEnteredEmail });
        this.startMagicLinkEmail(this.state.userEnteredEmail);
      } else {
        this.setState({
          userEnteredEmailError: 'Please enter a valid email address'
        })
      }
    }
  }

  render() {
    const { isAuthenticated } = this.props.auth;
    const { step } = this.state;
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
                    step: STEP_MOCK_PROTECTED_PAGE,
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
              <Button
                bsStyle="primary"
                className="btn-margin"
                onClick={this.handleSubmitParticipantData.bind(this)}
              >
                Submit (this also simulates the user clicking the email link)
              </Button>
            </div>
          )
        }
        
        {/*
          MOCKING user navs to landing page direct flow...
        */}
        {
          !isAuthenticated() && step === STEP_MOCK_PROTECTED_PAGE && (
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
      </div>
    )
  }
}

export default MockCommAuthFlow;
