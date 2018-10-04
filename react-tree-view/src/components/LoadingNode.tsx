// @flow

import "./LoadingNode.css";

import * as React from "react";

import { IoIosAirplane as Dot } from "react-icons/io";

export default class LoadingNode extends React.Component {
  public render() {
    return (
      <div className="LoadingNode">
        <div className="LoadingNode__titlerow">
          <div className="LoadingNode__doticon">
            <Dot size={20} />
          </div>
          <div className="LoadingNode__title">Loading data...</div>
        </div>
      </div>
    );
  }
}
