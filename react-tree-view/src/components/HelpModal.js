// @flow

import './HelpModal.css';

import React, { Component } from 'react';

import Draggable from 'react-draggable';

// TODO: make nice/complete

export default class HelpModal extends Component {
  render() {
    return (
      <Draggable>
        <div className="HelpModal">
          Arrow up/down: select next/prev node<br />
          Enter: create new node<br />
          etc...
        </div>
      </Draggable>
    );
  }
}
