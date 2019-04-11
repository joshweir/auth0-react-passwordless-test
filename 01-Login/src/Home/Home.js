import React, { Component } from 'react';

class Home extends Component {
  constructor(props) {
    super(props);
    this.state = { verifyCode: '', showVerifyCode: false };

    this.handleChange = this.handleChange.bind(this);
    this.keyPress = this.keyPress.bind(this);
  }

  handleChange(evt) {
    this.setState({ verifyCode: evt.target.value });
  }

  keyPress(e){
    if(e.keyCode == 13 && this.state.verifyCode.length > 0){
      this.props.auth.verifySMSCode(this.state.verifyCode);
    }
  }
  
  login() {
    this.props.auth.login();
  }
  
  loginUsingSMS() {
    this.setState({ showVerifyCode: true });
    this.props.auth.loginUsingSMS();
  }

  render() {
    const { isAuthenticated } = this.props.auth;
    console.log('render', this.state.showVerifyCode);
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
                <input value={this.state.verifyCode} onKeyDown={this.keyPress} onChange={this.handleChange} />
              </div> :
              <h4>
                Or use SMS method{' '}
                <a
                  style={{ cursor: 'pointer' }}
                  onClick={this.loginUsingSMS.bind(this)}
                >
                  Log In using SMS
                </a>
                {' '}to continue.
              </h4>
            )
        }
      </div>
    );
  }
}

export default Home;
