// @flow

import './Path.css';

import React, {Component} from 'react';

const SeperatorIcon = require('react-icons/lib/io/arrow-right-b');

type PathNode = {
  id: string,
  title: string,
}

export default class Path extends Component {
  props: {
    pathModel: Array<PathNode>
  }

  render() {
    const {pathModel} = this.props;

    return(
      <div className="Path">
        {
          pathModel
            .map((pathNode, index) => {
                return (
                  <div className="Path__part">
                    <SeperatorIcon className="Path__seperator"/>
                    <div className="Path__title">{pathNode.title}</div>
                  </div>);
            })
        }
      </div>
    );
  }
}
