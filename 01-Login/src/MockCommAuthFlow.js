import React, { Component } from 'react';
import { createBaseAuth0User } from './server-fake/create-base-auth0-user';

const STEP_SERVER_SIM_CREATE_PARTICIPANT_IN_AUTH0 = 0;

class MockCommAuthFlow extends Component {
  constructor(props) {
    super(props);
    this.state = {
      step: STEP_SERVER_SIM_CREATE_PARTICIPANT_IN_AUTH0,
      email: '',
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
      createBaseAuth0User(this.state.email);
      this.nextStep();
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
          !isAuthenticated() && step === STEP_SERVER_SIM_CREATE_PARTICIPANT_IN_AUTH0 && (
            <div>
              <h4>Step #{step + 1}</h4>
              <p>Enter the email of participant to create base auth0 account:</p>
              <input value={this.state.email} onKeyDown={this.keyPressEmail.bind(this)} onChange={this.handleChangeEmail.bind(this)} />
            </div>
          )
        }
      </div>
    )
  }
}

export default MockCommAuthFlow;
