// @flow

import './NodesContainer.css'

import React, { Component } from 'react';

import JSONTree from 'react-json-tree'
import KeyHandler from 'react-key-handler';
import LoadingNode from './components/LoadingNode.js';
import Node from './components/Node.js';
import fire from './fire';

export default class NodeContainer extends Component {
  state = {
    // Original data from firebase
    firemodel: undefined,

    // Options governing the translation between firemodel -> viewModel
    viewOptions: {
      focus: {
        id: undefined,
        type: 'title', // 'none'/'title'/...
      },

      expanded: new Set([]),
      hideCompleted: true,
    }
  }

  getNodesRef() {
    let {user} = this.props;
    return fire.database().ref('users').child(user.uid);
  }

  componentDidMount() {
    let { viewOptions } = this.state;

    /* Create reference to messages in Firebase Database */
    this.getNodesRef().on('value', (snapshot) => {
      const firemodel = snapshot.val();
      this.setState({firemodel});
    });
  }

  controller = {
    helpers: {
      findParentIdTo: (id) => {
      },
      findVisibleChildren: (nodeId) => {
      },
      findVisibleSiblingsTo: (id) => {
      }
    },

    changeTitle: (id, newTitle) => {
      this.getNodesRef().child(id).update({title: newTitle});
    },

    toggleExpand: (id) => {
      let {viewOptions} = this.state;

      if(viewOptions.expanded.has(id)) {
        viewOptions.expanded.delete(id);
      } else {
        viewOptions.expanded.add(id);
      }

      this.setState({ viewOptions });
    },

    collapse: (id) => {
      let {viewOptions} = this.state;
      viewOptions.expanded.delete(id);
      this.setState({ viewOptions });
    },

    expand: (id) => {
      let {viewOptions} = this.state;
      viewOptions.expanded.add(id);
      this.setState({ viewOptions });
    },

    blur: (id) => {
      return;
      let {viewOptions} = this.state;

      if (viewOptions.focus.id !== id) {
        return;
      }

      viewOptions.focus.id = undefined;
      this.setState({ viewOptions });
    },

    focus: (id, type) => {
      let {viewOptions} = this.state;

      if (id === viewOptions.focus.id && viewOptions.focus.type === type) {
        return;
      }

      viewOptions.focus.id = id;
      viewOptions.focus.type = type;

      this.setState({ viewOptions });
    },
    nextFocus: () => {
      let {viewOptions} = this.state;
      const flattened = this.getVisibleNodeIdsFlattened();
      let index = (flattened.indexOf(viewOptions.focus.id) + 1) % flattened.length;
      this.controller.focus(flattened[index], 'title');
    },
    prevFocus: () => {
      let {viewOptions} = this.state;
      const flattened = this.getVisibleNodeIdsFlattened();
      let index = (flattened.indexOf(viewOptions.focus.id) - 1) % flattened.length;
      if (index < 0) {
        index = flattened.length - 1;
      }
      this.controller.focus(flattened[index], 'title');
    },
    complete: (id) => {
    },
    createSiblingTo: (siblingId) => {
    },
    indent: (id) => {
    },
    outdent: (id) => {
    }
  };

  getViewModel() {
    let {firemodel, viewOptions} = this.state;

    if (!firemodel) {
      return undefined;
    }

    let recursive = (id, node) => {
      // Create viewModel
      let viewModel = {};
      viewModel.title = node.title;
      viewModel.id = id;
      viewModel.focus = 'none';
      if (viewOptions.focus.id === id) {
        viewModel.focus = viewOptions.focus.type;
      }

      // Make sure children only include visible children, but is always an array
      const childrenIds =
        (node.children || [])
          .filter(childId => firemodel[childId])
          .filter(childId => !(firemodel[childId].complete && viewOptions.hideCompleted));

      viewModel.expandCapability = 'none';
      if (childrenIds.length > 0) {
        viewModel.expandCapability = 'expand';
      }

      // If node is not expanded, hide children
      const expandedChildren = childrenIds;//viewOptions.expanded.has(id)?childrenIds:[];
      if (expandedChildren.length > 0) {
        viewModel.expandCapability = 'collapse';
      }

      viewModel.children = expandedChildren
        .map(childId => recursive(childId, firemodel[childId]));

      return viewModel;
    }

    return recursive('root', firemodel['root']);
  }

  getVisibleNodeIdsFlattened() {
    let {firemodel} = this.state;

    const viewModel = this.getViewModel();

    let flatten = (viewModel) => {
      return [].concat.apply([viewModel.id], viewModel.children.map(child => flatten(child)));
    }

    return flatten(viewModel);
  }

  render() {
    const {firemodel, viewOptions} = this.state;
    const controller = this.controller;
    const viewModel = this.getViewModel();

    return (
      <div className='NodesContainer'>
        <KeyHandler keyEventName={'keydown'} keyValue='ArrowDown' onKeyHandle={() => this.controller.nextFocus()} />
        <KeyHandler keyEventName={'keydown'} keyValue='ArrowUp' onKeyHandle={() => this.controller.prevFocus()} />
        {
          viewModel &&
          <Node viewModel={viewModel} controller={controller}/>
        }
        {
          !viewModel &&
          <LoadingNode />
        }
      </div>
    );
  }
}
