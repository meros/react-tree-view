import "./App.css";

import * as React from "react";

import * as firebase from "firebase";
import * as Spinner from "react-spinkit";
import HelpModal from "./components/HelpModal";
import NodeContainer from "./NodeContainer";

class App extends React.Component {
  public state = {
    user: undefined
  };

  public componentDidMount() {
    firebase
      .auth()
      .getRedirectResult()
      .then(result => {
        const user = result.user;
        if (!user) {
          // Start a sign in process for an unauthenticated user.
          const provider = new firebase.auth.GoogleAuthProvider();
          provider.addScope("profile");
          provider.addScope("email");
          firebase.auth().signInWithRedirect(provider);
          return;
        }

        this.setState({ user });
      });
  }

  public render() {
    const { user } = this.state;
    return (
      <div className="App">
        <div className="App__nodescontainer">
          {user !== undefined && <NodeContainer user={user} />}
          {user === undefined && (
            <div className="App_authenticatingcontainer">
              <Spinner name="folding-cube" />
            </div>
          )}
        </div>
        <HelpModal />
      </div>
    );
  }
}

export default App;
