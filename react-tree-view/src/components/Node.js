import './Node.css'

import React, { Component } from 'react';

import cx from 'classnames/bind';

const ArrowRight = require('react-icons/lib/io/arrow-right-b');
const ArrowDown = require('react-icons/lib/io/arrow-down-b');
const Dot = require('react-icons/lib/io/minus-round');

class Node extends Component {

  componentWillUpdate() {
    this.focusIfNeeded();
  }

  componentDidMount() {
    this.focusIfNeeded();
  }

  focusIfNeeded() {
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
    const {model, viewModel, controller} = this.props;

    const titleSelected = this.getTitleSelected(model, viewModel);

    const visibleChildren = model.children.filter(child => !child.complete);
    const hasChildren = visibleChildren.length > 0;
    const expanded = viewModel.expanded.has(model.id);
    const showChildren = expanded && hasChildren;
    const isComplete = model.complete;

    return (
      <div className='Node'>
        <div className='Node__titlerow'>
          <div className={cx("Node__doticon", {"Node__doticon--focus": titleSelected})} onClick={() => controller.toggleExpand(model.id)}>
            {
              hasChildren && !expanded &&
              <ArrowRight size={20} />
            }
            {
              hasChildren && expanded &&
              <ArrowDown size={20} />
            }
            {
              !hasChildren &&
              <Dot size={20} />
            }
          </div>
          <input
            ref={(el) => this.titleInput = el}
            className={cx('Node__title', {'Node__title--focus': titleSelected})}
            onBlur={() => controller.blur(model.id)}
            onFocus={() => controller.focus(model.id, 'title')}
            onChange={(event) => controller.changeTitle(model.id, event.target.value)}
            onKeyDown={(e) => {
              // Arrow up
              if (e.keyCode === 38) {
                if (e.metaKey) {
                  controller.collapse(model.id);
                } else {
                  controller.prevFocus();
                }
                e.preventDefault();
              }

              // Arrow down
              if (e.keyCode === 40) {
                if (e.metaKey) {
                  controller.expand(model.id);
                } else {
                  controller.nextFocus();
                }
                e.preventDefault();
              }

              // Enter
              if (e.keyCode === 13) {
                if (e.metaKey) {
                  controller.complete(model.id);
                } else {
                  controller.createSiblingTo(model.id);
                }
                e.preventDefault();
              }

              // Tab
              if (e.keyCode === 9) {
                if (e.shiftKey) {
                  controller.outdent(model.id);
                  e.preventDefault();
                } else {
                  controller.indent(model.id);
                  e.preventDefault();
                }
              }
            }}
            value={model.title} />
        </div>
        {
          showChildren &&
          <div className='Node__childcontainer'>
            {
              visibleChildren
                .map((child) => <Node model={child} viewModel={viewModel} key={child.id} controller={controller}/>)
            }
          </div>
        }
      </div>
    );
  }
}

export default Node;
