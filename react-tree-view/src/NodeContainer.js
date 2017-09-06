// @flow

import './NodesContainer.css'

import React, { Component } from 'react';

import KeyHandler from 'react-key-handler';
import LoadingNode from './components/LoadingNode.js';
import Node from './components/Node.js';
import fire from './fire';

export default class NodeContainer extends Component {
  state = {
    // Original data from firebase
    firemodel: undefined,

    // Model of what is currently being shown
    viewModel: undefined,

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
      const nodes = snapshot.val();
      const firemodel = snapshot.val();

      let recursiveFireModelToViewModel = (id, viewModel) => {
        viewModel.id = id;

        // Make sure children only include visible children, but is always an array
        const childrenIds =
          (viewModel.children || [])
            .filter(childId => nodes[childId])
            .filter(childId => !(nodes[childId].complete && viewOptions.hideCompleted));

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
          .map(childId => recursiveFireModelToViewModel(childId, nodes[childId]));

        return viewModel;
      }

      // Kickstart the recursive translation
      const viewModel = recursiveFireModelToViewModel(
        'root',
        nodes['root'] || { title: 'Welcome to Tree View!' });

      this.setState({viewModel, firemodel});
    });
  }

  controller = {
    helpers: {
      flattenVisibleNodes: () => {
      },
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
      let {viewOptions} = this.state;

      if (viewOptions.focus.id !== id) {
        return;
      }

      viewOptions.focus.id = undefined;
      this.setState({ viewOptions });
    },

    focus: (id, type) => {
      let {viewOptions} = this.state;

      viewOptions.focus.id = id;
      viewOptions.focus.type = type;
      this.setState({ viewOptions });
    },

    nextFocus: () => {
    },

    prevFocus: () => {
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

  render() {
    let {viewModel, viewOptions} = this.state;
    let controller = this.controller;

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
