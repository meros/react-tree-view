// @flow

import './App.css';

import React, { Component } from 'react';

import NodeContainer from './NodeContainer';
import Spinner from 'react-spinkit';
import firebase from 'firebase'

class App extends Component {

  state = {
    user: undefined,
  };

  componentDidMount() {
    firebase.auth().getRedirectResult().then((result) => {
      let user = result.user;
      if (!user) {
        // Start a sign in process for an unauthenticated user.
        var provider = new firebase.auth.GoogleAuthProvider();
        provider.addScope('profile');
        provider.addScope('email');
        firebase.auth().signInWithRedirect(provider);
        return;
      }

      this.setState({user});
    });
  }

  render() {
    const {user} = this.state;
    return (
      <div className='App'>
        <div className='App__nodescontainer'>
          {
            user !== undefined &&
            <NodeContainer user={user} />
          }
          {
            user === undefined &&
            <div className='App_authenticatingcontainer'>
              <Spinner name="folding-cube" />
            </div>
          }
        </div>
      </div>
    );
  }
}

export default App;
