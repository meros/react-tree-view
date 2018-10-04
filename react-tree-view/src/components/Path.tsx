import "./Path.css";

import * as React from "react";
import { IoIosAirplane as SeperatorIcon } from "react-icons/io";

interface IPathNode {
  id: string;
  title: string;
}

interface IProps {
  pathModel: IPathNode[];
}
export default class Path extends React.Component<IProps> {
  public render() {
    const { pathModel } = this.props;

    return (
      <div className="Path">
        {pathModel.map((pathNode, index) => {
          return (
            <div key={index} className="Path__part">
              <SeperatorIcon className="Path__seperator" />
              <div className="Path__title">{pathNode.title}</div>
            </div>
          );
        })}
      </div>
    );
  }
}
