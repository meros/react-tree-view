// @flow

import './NodesContainer.css';

import React, { Component } from 'react';

import JsonView from 'react-json-view';
import KeyHandler from 'react-key-handler';
import LoadingNode from './components/LoadingNode.js';
import Node from './components/Node.js';
import Path from './components/Path';
import type { ViewModel } from './components/Node.js';
import fire from './fire';
import update from 'immutability-helper';

type FireNode = {
  title: string,
  completeStatus: 'complete' | 'recentlyCompleted' | 'uncomplete',
  children: Array<string>,
};

type FireModel = {
  [nodeid: string]: FireNode,
};

export default class NodeContainer extends Component {
  state: {
    firemodel: FireModel,
    viewOptions: {
      focus: {
        id: string | void,
        type: 'title',
      },
      expanded: any,
      hideCompleted: boolean,
      rootNode: string,
    },
  } = {
    // Original data from firebase
    firemodel: {},

    // Options governing the translation between firemodel -> viewModel
    viewOptions: {
      focus: {
        id: undefined,
        type: 'title', // 'none'/'title'/...
      },

      expanded: new Set([]),
      hideCompleted: true,
      rootNode: 'root',
    },
  };

  getNodesRef() {
    let { user } = this.props;
    return fire
      .database()
      .ref('users')
      .child(user.uid)
      .child('nodes');
  }

  componentDidMount() {
    /* Create reference to messages in Firebase Database */
    this.getNodesRef().on('value', snapshot => {
      let firemodel = snapshot.val();
      this.setState({ firemodel });

      // Inject root
      const newNode: FireNode = {
        title: 'Welcome to TreeView!',
        completeStatus: 'uncomplete',
        children: [],
      };
      if (!firemodel) {
        this.getNodesRef()
          .child('root')
          .set(newNode);
      }
    });
  }

  getParentIdTo(id: string) {
    let { firemodel } = this.state;
    if (!firemodel) {
      return undefined;
    }

    return Object.keys(firemodel).find(nodeId => {
      if (!firemodel || !firemodel[nodeId]) {
        return false;
      }

      return (firemodel[nodeId].children || []).indexOf(id) !== -1;
    });
  }

  controller = {
    changeTitle: (id: string, newTitle: string) => {
      this.getNodesRef()
        .child(id)
        .update({ title: newTitle });
    },

    toggleExpand: (id: string) => {
      let { viewOptions } = this.state;

      if (viewOptions.expanded.has(id)) {
        viewOptions.expanded.delete(id);
      } else {
        viewOptions.expanded.add(id);
      }

      this.setState({ viewOptions });
    },

    collapse: (id: string) => {
      let { viewOptions } = this.state;
      viewOptions.expanded.delete(id);
      this.setState({ viewOptions });
    },

    expand: (id: string) => {
      let { viewOptions } = this.state;
      viewOptions.expanded.add(id);
      this.setState({ viewOptions });
    },

    dragUp: (id: string) => {
      let { firemodel, viewOptions } = this.state;

      if (!firemodel) {
        return;
      }

      // Make sure we have a parent
      const parentId = this.getParentIdTo(id);
      if (!parentId || !firemodel[parentId]) {
        return;
      }

      const flattened = this.getVisibleNodeIdsFlattened(id);
      const newSiblingId = flattened[flattened.indexOf(id) - 1];
      if (!newSiblingId) {
        return;
      }

      // Avoid dragging out of zommed view
      if (newSiblingId === viewOptions.rootNode) {
        return;
      }

      // Make sure new sibling has a parent!
      const newSiblingParentId = this.getParentIdTo(newSiblingId);
      if (!newSiblingParentId) {
        return;
      }

      // Remove from old parent!
      const siblingIds = firemodel[parentId].children || [];
      const siblingIndex = siblingIds.indexOf(id);
      siblingIds.splice(siblingIndex, 1);
      this.getNodesRef()
        .child(parentId)
        .update({ children: siblingIds });

      // Add to new parent!
      const newSiblingIds = firemodel[newSiblingParentId].children || [];
      const newSiblingIndex = newSiblingIds.indexOf(newSiblingId);
      newSiblingIds.splice(newSiblingIndex, 0, id);
      this.getNodesRef()
        .child(newSiblingParentId)
        .update({ children: newSiblingIds });
    },

    dragDown: (id: string) => {
      let { firemodel } = this.state;

      if (!firemodel) {
        return;
      }

      // Make sure we have a parent
      const parentId = this.getParentIdTo(id);
      if (!parentId || !firemodel[parentId]) {
        return;
      }

      const flattened = this.getVisibleNodeIdsFlattened(id);
      const newSiblingId = flattened[flattened.indexOf(id) + 1];
      if (!newSiblingId) {
        return;
      }

      // Make sure new sibling has a parent!
      const newSiblingParentId = this.getParentIdTo(newSiblingId);
      if (!newSiblingParentId) {
        return;
      }

      // Remove from old parent!
      const siblingIds = firemodel[parentId].children || [];
      const siblingIndex = siblingIds.indexOf(id);
      siblingIds.splice(siblingIndex, 1);
      this.getNodesRef()
        .child(parentId)
        .update({ children: siblingIds });

      // Add to new parent!
      const newSiblingIds = firemodel[newSiblingParentId].children || [];
      const newSiblingIndex = newSiblingIds.indexOf(newSiblingId);
      newSiblingIds.splice(newSiblingIndex + 1, 0, id);
      this.getNodesRef()
        .child(newSiblingParentId)
        .update({ children: newSiblingIds });
    },

    blur: (id: string) => {
      let { viewOptions } = this.state;

      if (viewOptions.focus.id !== id) {
        return;
      }

      viewOptions.focus.id = undefined;
      this.setState({ viewOptions });
    },

    focus: (id: string, type: 'title') => {
      let { viewOptions } = this.state;

      if (id === viewOptions.focus.id && viewOptions.focus.type === type) {
        return;
      }

      viewOptions.focus.id = id;
      viewOptions.focus.type = type;

      this.setState({ viewOptions });
    },
    nextFocus: (skipDirectChildrenOf: string | void = undefined) => {
      let { viewOptions } = this.state;

      // In some cases, we don't want to focus first child, but rather next sibling
      // When completing a subtree for instance...
      let flattened = this.getVisibleNodeIdsFlattened(skipDirectChildrenOf);

      let index =
        (flattened.indexOf(viewOptions.focus.id) + 1) % flattened.length;

      if (!flattened[index]) {
        return;
      }

      this.controller.focus(flattened[index], 'title');
    },
    prevFocus: () => {
      let { viewOptions } = this.state;
      const flattened = this.getVisibleNodeIdsFlattened();
      let index =
        (flattened.indexOf(viewOptions.focus.id) - 1) % flattened.length;
      if (index < 0) {
        index = flattened.length - 1;
      }

      if (!flattened[index]) {
        return;
      }

      this.controller.focus(flattened[index], 'title');
    },
    complete: (id: string) => {
      const { firemodel, viewOptions } = this.state;

      if (!firemodel) {
        return;
      }

      const wasComplete = firemodel[id].completeStatus === 'uncomplete';
      const nodeRef = this.getNodesRef().child(id);

      nodeRef.update({
        completeStatus: wasComplete ? 'recentlyCompleted' : 'uncomplete',
      });

      if (wasComplete) {
        setTimeout(() => {
          nodeRef.once('value').then(snapshot => {
            if (snapshot.val().completeStatus !== 'recentlyCompleted') {
              return;
            }

            nodeRef.update({
              completeStatus: 'complete',
            });
          });
        }, 1500);
      }
    },
    createSiblingTo: (siblingId: string) => {
      // TODO: should split current node instead of creating blank
      // TODO: should create in children iff siblindId has expanded children
      const { firemodel, viewOptions } = this.state;
      if (!firemodel) {
        return;
      }

      // Find siblings and our place among them
      let parentId = this.getParentIdTo(siblingId) || viewOptions.rootNode;

      if (siblingId === viewOptions.rootNode) {
        parentId = viewOptions.rootNode;
      }

      let siblingIds = firemodel[parentId].children || [];
      const siblingIndex = siblingIds.indexOf(siblingId);

      // Create new node
      const newNode: FireNode = {
        title: '',
        completeStatus: 'uncomplete',
        children: [],
      };
      let newNodeRef = this.getNodesRef().push(newNode);

      // Set focus!
      this.controller.focus(newNodeRef.key, 'title');

      // Expand parent
      this.controller.expand(parentId);

      // Insert at correct place
      siblingIds.splice(siblingIndex + 1, 0, newNodeRef.key);
      this.getNodesRef()
        .child(parentId)
        .update({ children: siblingIds });
    },
    indent: (id: string) => {
      const { firemodel, viewOptions } = this.state;
      if (!firemodel) {
        return;
      }

      if (id === viewOptions.rootNode) {
        return;
      }

      // Check if there is a valid sibling to make new parent
      const parentId = this.getParentIdTo(id) || viewOptions.rootNode;
      let siblingIds = firemodel[parentId].children || [];

      // Check if there is a valid VISIBLE sibling to make new parent
      const flattenVisibleNodes = this.getVisibleNodeIdsFlattened();
      let visibleSiblingIds = siblingIds.filter(
        visibleSiblingId =>
          flattenVisibleNodes.indexOf(visibleSiblingId) !== -1,
      );

      const siblingIndex = siblingIds.indexOf(id);
      const visibleSiblingIndex = visibleSiblingIds.indexOf(id);

      // No suitable sibling :(
      if (visibleSiblingIndex <= 0) {
        return;
      }

      // Remove from old parent!
      siblingIds.splice(siblingIndex, 1);
      this.getNodesRef()
        .child(parentId)
        .update({ children: siblingIds });

      // Add to new parent!
      const newParentId = visibleSiblingIds[visibleSiblingIndex - 1];
      let newSiblingIds = firemodel[newParentId].children || [];
      newSiblingIds.push(id);
      this.getNodesRef()
        .child(newParentId)
        .update({ children: newSiblingIds });

      // Expand new parent!
      this.controller.expand(newParentId);
    },
    outdent: (id: string) => {
      const { firemodel } = this.state;
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
      this.getNodesRef()
        .child(parentId)
        .update({ children: siblingIds });

      // Find our place among the new siblings
      let parentSiblingIds = firemodel[grandParentId].children || [];
      const parentSiblingIndex = parentSiblingIds.indexOf(parentId);

      // Add to new parent!
      parentSiblingIds.splice(parentSiblingIndex + 1, 0, id);
      this.getNodesRef()
        .child(grandParentId)
        .update({ children: parentSiblingIds });
    },
    zoomIn: (id: string) => {
      const { viewOptions } = this.state;
      this.setState({
        viewOptions: update(viewOptions, { rootNode: { $set: id } }),
      });
    },
    zoomOut: (id: string) => {
      const { viewOptions } = this.state;

      this.setState({
        viewOptions: update(viewOptions, {
          rootNode: {
            $set: this.getParentIdTo(viewOptions.rootNode) || 'root',
          },
        }),
      });
    },
  };

  getPathModel() {
    let { firemodel, viewOptions } = this.state;

    if (!firemodel) {
      return undefined;
    }

    let result = [];
    let currNode: string | void = viewOptions.rootNode;

    while (currNode && currNode !== 'root') {
      if (firemodel[currNode]) {
        const pathNode = {};
        pathNode.id = currNode;
        pathNode.title = firemodel[currNode].title;

        result.unshift(pathNode);
      }
      currNode = this.getParentIdTo(currNode);
    }

    return result;
  }

  getViewModel(): ViewModel | void {
    let { firemodel, viewOptions } = this.state;

    if (!firemodel) {
      return undefined;
    }

    let recursive = (id, node) => {
      // Create viewModel
      let viewModel: ViewModel = {
        id: id,
        title: node.title,
        strikethrough: node.completeStatus !== 'uncomplete',
        focus: 'none',
        children: [],
        expandCapability: 'none',
      };

      if (viewOptions.focus.id === id) {
        viewModel.focus = viewOptions.focus.type;
      }

      // Make sure children only include visible children, but is always an array
      const childrenIds = (node.children || [])
        .filter(childId => firemodel[childId])
        .filter(
          childId =>
            !(
              firemodel[childId].completeStatus === 'complete' &&
              viewOptions.hideCompleted
            ),
        );

      viewModel.expandCapability = 'none';
      if (childrenIds.length > 0) {
        viewModel.expandCapability = 'expand';
      }

      // If node is not expanded, hide children
      const expandedChildren = viewOptions.expanded.has(id) ? childrenIds : [];
      if (expandedChildren.length > 0) {
        viewModel.expandCapability = 'collapse';
      }

      viewModel.children = expandedChildren.map(childId =>
        recursive(childId, firemodel[childId]),
      );

      return viewModel;
    };
    const rootNode = firemodel[viewOptions.rootNode];
    if (!rootNode) {
      return undefined;
    }

    return recursive(viewOptions.rootNode, rootNode);
  }

  getVisibleNodeIdsFlattened(skipChildrenOfId: string | void = undefined) {
    let { firemodel } = this.state;
    if (!firemodel) {
      return [];
    }

    const viewModel = this.getViewModel();

    if (!viewModel) {
      return [];
    }

    let flatten = viewModel => {
      if (skipChildrenOfId && viewModel.id === skipChildrenOfId) {
        return [viewModel.id];
      }

      return [].concat.apply(
        [viewModel.id],
        viewModel.children.map(child => flatten(child)),
      );
    };

    return flatten(viewModel);
  }

  render() {
    const controller = this.controller;
    const viewModel = this.getViewModel();
    const { viewOptions } = this.state;
    const pathModel = this.getPathModel();
    return (
      <div className="NodesContainer">
        {viewOptions.rootNode !== 'root' && <Path pathModel={pathModel} />}
        {viewOptions.rootNode !== 'root' && (
          <div className="NodesContainer__pathspacer" />
        )}
        <KeyHandler
          keyEventName={'keydown'}
          keyValue="ArrowDown"
          onKeyHandle={() => this.controller.nextFocus()}
        />
        <KeyHandler
          keyEventName={'keydown'}
          keyValue="ArrowUp"
          onKeyHandle={() => this.controller.prevFocus()}
        />
        {viewModel !== undefined && (
          <Node viewModel={viewModel} controller={controller} />
        )}
        {!viewModel && <LoadingNode />}
      </div>
    );
  }
}
