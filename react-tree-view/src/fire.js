// @flow

import firebase from 'firebase';
var config = {
  /* COPY THE ACTUAL CONFIG FROM FIREBASE CONSOLE */
  apiKey: 'AIzaSyACn8X8bPIiS15h-ijYxOkcqiFVAsYfvdA',
  authDomain: 'tree-view-472e2.firebaseapp.com',
  databaseURL: 'https://tree-view-472e2.firebaseio.com/',
  storageBucket: 'tree-view-472e2.appspot.com',
};
var fire = firebase.initializeApp(config);
export default fire;
