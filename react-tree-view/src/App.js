import './App.css';

import React, { Component } from 'react';

import NodeContainer from './NodeContainer';
import equal from 'deep-equal';
import firebase from 'firebase'
import logo from './logo.svg';
import uuid from 'uuid/v4';

class App extends Component {

  state = {
    user: undefined,
  };

  componentDidMount() {
    var provider = new firebase.auth.GoogleAuthProvider();
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
            <NodeContainer user={user} controller={this.controller}/>
          }
        </div>
      </div>
    );
  }
}

export default App;
