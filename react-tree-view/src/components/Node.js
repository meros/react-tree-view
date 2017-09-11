import './Node.css'

import React, { Component } from 'react';

import cx from 'classnames/bind';

const ArrowRight = require('react-icons/lib/io/arrow-right-b');
const ArrowDown = require('react-icons/lib/io/arrow-down-b');
const Dot = require('react-icons/lib/io/minus-round');

class Node extends Component {

  componentWillUpdate(nextProps) {
    this.focusIfNeeded(nextProps.viewModel);
  }

  componentDidMount() {
    this.focusIfNeeded(this.props.viewModel);
  }

  focusIfNeeded(viewModel) {
    if (this.getTitleSelected(viewModel)) {
      setTimeout(() => {
        this.titleInput.focus();
      }, 0);
    }
  }

  getTitleSelected(viewModel) {
    return viewModel.focus === 'title';
  }

  onKeyDown(e) {
    const {viewModel, controller} = this.props;

    // Arrow left
    if (e.keyCode === 37) {
      if(e.metaKey) {
        controller.zoomOut(viewModel.id);
        e.preventDefault();
      }
    }

    // Arrow left
    if (e.keyCode === 39) {
      if(e.metaKey) {
        controller.zoomIn(viewModel.id);
        e.preventDefault();
      }
    }

    // Arrow up
    if (e.keyCode === 38) {
      if (e.shiftKey && e.metaKey) {
        controller.dragUp(viewModel.id);
      } else if(e.metaKey) {
        controller.collapse(viewModel.id);
      } else {
        controller.prevFocus();
      }
      e.preventDefault();
    }

    // Arrow down
    if (e.keyCode === 40) {
      if (e.shiftKey && e.metaKey) {
        controller.dragDown(viewModel.id);
      } else if (e.metaKey) {
        controller.expand(viewModel.id);
      } else {
        controller.nextFocus();
      }
      e.preventDefault();
    }

    // Enter
    if (e.keyCode === 13) {
      if (e.metaKey) {
        controller.complete(viewModel.id);
      } else {
        controller.createSiblingTo(viewModel.id);
      }
      e.preventDefault();
    }

    // Tab
    if (e.keyCode === 9) {
      if (e.shiftKey) {
        controller.outdent(viewModel.id);
        e.preventDefault();
      } else {
        controller.indent(viewModel.id);
        e.preventDefault();
      }
    }
  }

  render() {
    const {viewModel, controller} = this.props;

    const titleSelected = this.getTitleSelected(viewModel);

    return (
      <div className='Node'>
        <div className='Node__titlerow'>
          <div
            className={cx("Node__doticon", {"Node__doticon--focus": titleSelected})}
            onClick={() => controller.toggleExpand(viewModel.id)}>
            {
              viewModel.expandCapability === 'expand' &&
              <ArrowRight size={20} />
            }
            {
              viewModel.expandCapability === 'collapse' &&
              <ArrowDown size={20} />
            }
            {
              viewModel.expandCapability === 'none' &&
              <Dot size={20} />
            }
          </div>
          <input
            ref={(el) => this.titleInput = el}
            className={cx(
              'Node__title',
              {'Node__title--focus': titleSelected},
              {'Node__title--complete': viewModel.complete})}
            onBlur={() => controller.blur(viewModel.id)}
            onFocus={() => controller.focus(viewModel.id, 'title')}
            onChange={(event) => controller.changeTitle(viewModel.id, event.target.value)}
            onKeyDown={(e) => this.onKeyDown(e)}
            value={viewModel.title} />
        </div>
        {
          viewModel.children.length > 0 &&
          <div className='Node__childcontainer'>
            {
              viewModel.children
                .map(childViewModel =>
                  <Node
                    viewModel={childViewModel}
                    controller={controller}
                    key={childViewModel.id} />)
            }
          </div>
        }
      </div>
    );
  }
}

export default Node;
