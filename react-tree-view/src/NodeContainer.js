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
    /* Create reference to messages in Firebase Database */
    this.getNodesRef().on('value', (snapshot) => {
      let firemodel = snapshot.val();
      this.setState({firemodel});

      // Inject root
      if (!firemodel) {
        this.getNodesRef().child('root').set({title: 'Welcome to TreeView!'});
      }
    });
  }

  getParentIdTo(id) {
    let {firemodel} = this.state;
    if (!firemodel) {
      return undefined;
    }

    return Object.keys(firemodel).find(nodeId => (firemodel[nodeId].children || []).indexOf(id) !== -1)
  }

  controller = {
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

      if (id === viewOptions.focus.id && viewOptions.focus.type === type) {
        return;
      }

      viewOptions.focus.id = id;
      viewOptions.focus.type = type;

      this.setState({ viewOptions });
    },
    nextFocus: (skipDirectChildren = false) => {
      let {viewOptions, firemodel} = this.state;

      // In some cases, we don't want to focus first child, but rather next sibling
      // When completing a subtree for instance...
      let flattened = this.getVisibleNodeIdsFlattened(skipDirectChildren?viewOptions.focus.id:undefined);

      const currentFocusNode = firemodel[viewOptions.focus.id];

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
      const {firemodel, viewOptions} = this.state;
      const wasComplete = firemodel[id].complete;
      this.getNodesRef().child(id).update({complete: !wasComplete});

      if (viewOptions.hideCompleted && !wasComplete) {
        this.controller.nextFocus(true);
      }
    },
    createSiblingTo: (siblingId) => {
      // TODO: should split current node instead of creating blank
      // TODO: should create in children iff siblindId has expanded children
      const {firemodel} = this.state;
      if (!firemodel) {
        return;
      }

      // Find siblings and our place among them
      const parentId = this.getParentIdTo(siblingId) || 'root';
      let siblingIds = firemodel[parentId].children || [];
      const siblingIndex = siblingIds.indexOf(siblingId);

      // Create new node
      let newNodeRef = this.getNodesRef().push({title: ''});

      // Set focus!
      this.controller.focus(newNodeRef.key, 'title');

      // Insert at correct place
      siblingIds.splice(siblingIndex + 1, 0, newNodeRef.key);
      this.getNodesRef().child(parentId).update({children: siblingIds});
    },
    indent: (id) => {
      const {firemodel} = this.state;
      if (!firemodel) {
        return;
      }

      if (id === root) {
        return;
      }

      // Check if there is a valid sibling to make new parent
      const parentId = this.getParentIdTo(id) || 'root';
      let siblingIds = firemodel[parentId].children || [];

      // Check if there is a valid VISIBLE sibling to make new parent
      const flattenVisibleNodes = this.getVisibleNodeIdsFlattened();
      let visibleSiblingIds = siblingIds
        .filter(visibleSiblingId => flattenVisibleNodes.indexOf(visibleSiblingId) !== -1);

      const siblingIndex = siblingIds.indexOf(id);
      const visibleSiblingIndex = visibleSiblingIds.indexOf(id);

      // No suitable sibling :(
      if (visibleSiblingIndex <= 0) {
        return;
      }

      // Remove from old parent!
      siblingIds.splice(siblingIndex, 1);
      this.getNodesRef().child(parentId).update({children: siblingIds});

      // Add to new parent!
      const newParentId = visibleSiblingIds[visibleSiblingIndex-1];
      let newSiblingIds = firemodel[newParentId].children || [];
      newSiblingIds.push(id);
      this.getNodesRef().child(newParentId).update({children: newSiblingIds});

      // Expand new parent!
      this.controller.expand(newParentId);
    },
    outdent: (id) => {
      const {firemodel} = this.state;
      if (!firemodel) {
        return;
      }

      // Make sure we have a parent
      const parentId = this.getParentIdTo(id);
      if (!parentId) {
        return;
      }

      // Make sure we have a grandparent
      const grandParentId = this.getParentIdTo(parentId);
      if (!grandParentId) {
        return;
      }

      // Find out place among siblings
      let siblingIds = firemodel[parentId].children || [];
      const siblingIndex = siblingIds.indexOf(id);

      // Remove from old parent!
      siblingIds.splice(siblingIndex, 1);
      this.getNodesRef().child(parentId).update({children: siblingIds});

      // Find our place among the new siblings
      let parentSiblingIds = firemodel[grandParentId].children || [];
      const parentSiblingIndex = parentSiblingIds.indexOf(parentId);

      // Add to new parent!
      parentSiblingIds.splice(parentSiblingIndex + 1, 0, id);
      this.getNodesRef().child(grandParentId).update({children: parentSiblingIds});
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
      viewModel.complete = node.complete;
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
      const expandedChildren = viewOptions.expanded.has(id)?childrenIds:[];
      if (expandedChildren.length > 0) {
        viewModel.expandCapability = 'collapse';
      }

      viewModel.children = expandedChildren
        .map(childId => recursive(childId, firemodel[childId]));

      return viewModel;
    }

    return recursive('root', firemodel['root']);
  }

  getVisibleNodeIdsFlattened(skipChildrenOfId = undefined) {
    let {firemodel} = this.state;
    if (!firemodel) {
      return [];
    }

    const viewModel = this.getViewModel();

    let flatten = (viewModel) => {
      if (viewModel.id === skipChildrenOfId) {
        return [viewModel.id];
      }

      return [].concat.apply(
        [viewModel.id],
        viewModel.children.map(child => flatten(child)));
    }

    return flatten(viewModel);
  }

  render() {
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
