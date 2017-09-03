import './Node.css'

import React, { Component } from 'react';

import cx from 'classnames/bind';

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
    let {model, viewModel, controller} = this.props;

    let titleSelected = this.getTitleSelected(model, viewModel);

    let expanded = viewModel.expanded.has(model.id);
    let showChildren = expanded && model.children.length > 0;

    return (
      <div className='Node'>
        <div className='Node__titlerow'>
          <div className={cx('Node__expandsign')}>
          {
            model.children.length>0?expanded?'-':'+':''
          }
          </div>
          <div className={cx('Node__titledot', {'Node__titledot--focus': titleSelected})} onClick={() => controller.toggleExpand(model.id)} />
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
                controller.createSiblingTo(model.id);
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
              model.children.map((child) => <Node model={child} viewModel={viewModel} key={child.id} controller={controller}/>)
            }
          </div>
        }
      </div>
    );
  }
}

export default Node;
