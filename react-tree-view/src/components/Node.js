import './Node.css'

import React, { Component } from 'react';

import cx from 'classnames/bind';

class AutoFocusInput extends Component {
  componentDidMount() {
    let {controller} = this.props;
    let {input} = this.refs;

    input.focus();
    input.addEventListener('keydown', function(e) {
      // Arrow Down
      if (e.keyCode === 40) {
        controller.nextFocus();
        e.preventDefault();
      }

      // Arrow Up
      if (e.keyCode === 38) {
        controller.prevFocus();
        e.preventDefault();
      }
    });
  }

  render() {
    let {value} = this.props;

    return (
      <div
        className="Node__title--focus"
        contentEditable
        ref="input">
        {value}
      </div>
    );
  }
}

class Node extends Component {
  componentWillUpdate() {
    let titleSelected = this.getTitleSelected(this.props.model, this.props.viewModel);

    if (titleSelected) {
      setTimeout(() => {
        this.titleInput.focus();
      }, 0);
    }
  }

  getTitleSelected(model, viewModel) {
    return model.id === viewModel.focus.id &&
      viewModel.focus.type === 'title';
  }


  render() {
    let {model, viewModel, controller} = this.props;

    let titleSelected = this.getTitleSelected(model, viewModel);

    let expanded = viewModel.expanded.has(model.id);

    return (
      <div className="Node">
        <div className="Node__titlerow">
          <div className={cx("Node__expandicon", {expanded: expanded})} onClick={() => controller.toggleExpand(model.id)}>
          {
            model.children.length>0?expanded?"-":"+":""
          }
          </div>
          <div
            ref={(el) => this.titleInput = el}
            className={cx("Node__title", {"Node__title--focus": titleSelected})}
            contentEditable={titleSelected}
            onBlur={() => controller.blur()}
            onKeyDown={(e) => {
              // Arrow up
              if (e.keyCode == 38) {
                controller.prevFocus();
                e.preventDefault();
              }

              // Arrow down
              if (e.keyCode == 40) {
                controller.nextFocus();
                e.preventDefault();
              }

              // Enter
              if (e.keyCode == 13) {
                controller.createSiblingTo(model.id);
                e.preventDefault();
              }
            }}>
            {model.title}
          </div>
        </div>
        {
          expanded &&
          <div className="Node__childcontainer">
            {
              model.children.map((child) => <Node model={child} viewModel={viewModel} key={child.id} controller={controller}/>)
            }
          </div>
        }
      </div>
    );
  }
}

export default Node;
