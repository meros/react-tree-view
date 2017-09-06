import './LoadingNode.css';

import React, { Component } from 'react';

const Dot = require('react-icons/lib/io/minus-round');

export default class LoadingNode extends Component {
  render() {
    return (
      <div className='LoadingNode'>
        <div className='LoadingNode__titlerow'>
          <div className="LoadingNode__doticon">
            <Dot size={20} />
          </div>
          <div className="LoadingNode__title">
            Loading data...
          </div>
        </div>
      </div>
    );
  }
}
