import React from 'react';
import { Route, Router } from 'react-router-dom';
import App from './App';
import Home from './Home/Home';
import Callback from './Callback/Callback';
import Auth from './Auth/Auth';
import history from './history';
import MockCommAuthFlow from './MockCommAuthFlow';

const auth = new Auth();

const handleAuthentication = ({location}) => {
  console.log('the location', location);
  console.log('the hash', location.hash);
  if (/access_token|id_token|error/.test(location.hash)) {
    auth.handleAuthentication(location.hash);
  }
}

export const makeMainRoutes = () => {
  return (
      <Router history={history}>
        <div>
          <Route path="/" render={(props) => <App auth={auth} {...props} />} />
          <Route path="/home" render={(props) => <Home auth={auth} {...props} />} />
          <Route path="/mock-comm-auth-flow" render={(props) => <MockCommAuthFlow auth={auth} {...props} />} />
          <Route path="/callback" render={(props) => {
            handleAuthentication(props);
            return <Callback {...props} /> 
          }}/>
        </div>
      </Router>
  );
}
