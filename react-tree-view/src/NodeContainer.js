import './NodesContainer.css'

import React, { Component } from 'react';

import KeyHandler from 'react-key-handler';
import LoadingNode from './components/LoadingNode.js';
import Node from './components/Node.js';
import fire from './fire';

export default class NodeContainer extends Component {
  state = {
    firemodel: undefined,
    model: undefined,
    viewModel: {
      focus: {
        id: undefined,
        type: 'title', // 'none'/'title'/...
      },
      expanded: new Set([]),
    }
  }

  getNodesRef() {
    let {user} = this.props;
    return fire.database().ref('users').child(user.uid);
  }

  componentDidMount() {
    /* Create reference to messages in Firebase Database */
    this.getNodesRef().on('value', (snapshot) => {
      let nodes = snapshot.val();

      let model = (nodes && nodes['root']) || {
         title: ''
       };

      let recurse = (id, model) => {
        model.id = id;

        if (model.children === undefined) {
          model.children = [];
        }

        model.children = model.children.filter(
          (childId) => {
            return nodes[childId] !== undefined
          })
          .map((childId) => {
            let childNode = nodes[childId];
            recurse(childId, childNode);
            return childNode;
          });
      }

      recurse('root', model);

      let firemodel = snapshot.val();

      this.setState({model, firemodel});
    });
  }

  controller = {
    helpers: {
      flattenVisibleNodes: () => {
          let {viewModel, model, firemodel} = this.state;

          if (!model) {
            return [];
          }

          let nodeIdsToFlatten = ['root'];
          let flattenedVisibleNodeIds = [];

          while (nodeIdsToFlatten.length) {
            const nodeId = nodeIdsToFlatten.shift();
            flattenedVisibleNodeIds.push(nodeId);

            this.controller.helpers.findVisibleChildren(nodeId)
              .reverse()
              .forEach(childId => nodeIdsToFlatten.unshift(childId));
          }

          return flattenedVisibleNodeIds;
      },
      findParentIdTo: (id) => {
        let firemodel = this.state.firemodel || {};

        return Object.keys(firemodel).find((potentialParentId) => {
          const children = firemodel[potentialParentId].children || [];
          return children.indexOf(id) != -1;
        });
      },
      findVisibleChildren: (nodeId) => {
        let {viewModel, model, firemodel} = this.state;
        if (!viewModel.expanded.has(nodeId)) {
          return [];
        }

        return (firemodel[nodeId].children || [])
          .filter(childId => !firemodel[childId].complete);
      },
      findVisibleSiblingsTo: (id) => {
        let firemodel = this.state.firemodel || {};

        let parentId = this.controller.helpers.findParentIdTo(id);
        if (!parentId) {
          return undefined;
        }

        return this.controller.helpers.findVisibleChildren(parentId);
      }
    },

    changeTitle: (id, newTitle) => {
      this.getNodesRef().child(id).update({title: newTitle});
    },

    toggleExpand: (id) => {
      let {viewModel} = this.state;

      if(viewModel.expanded.has(id)) {
        viewModel.expanded.delete(id);
      } else {
        viewModel.expanded.add(id);
      }

      this.setState({ viewModel });
    },

    collapse: (id) => {
      let {viewModel} = this.state;
      viewModel.expanded.delete(id);
      this.setState({ viewModel });
    },

    expand: (id) => {
      let {viewModel} = this.state;
      viewModel.expanded.add(id);
      this.setState({ viewModel });
    },

    blur: (id) => {
      let {viewModel} = this.state;

      if (viewModel.focus.id !== id) {
        return;
      }

      viewModel.focus.id = undefined;
      this.setState({ viewModel });
    },

    focus: (id, type) => {
      let {viewModel} = this.state;

      viewModel.focus.id = id;
      viewModel.focus.type = type;
      this.setState({ viewModel });
    },

    nextFocus: () => {
      let {model, firemodel, viewModel} = this.state;

      // No model, no focus!
      if (!model) {
        return;
      }

      const nodeIds = this.controller.helpers.flattenVisibleNodes();
      let index = (nodeIds.indexOf(viewModel.focus.id) + 1) % nodeIds.length;
      this.controller.focus(nodeIds[index], 'title');
    },

    prevFocus: () => {
      let {model, firemodel, viewModel} = this.state;

      // No model, no focus!
      if (!model) {
        return;
      }

      const nodeIds = this.controller.helpers.flattenVisibleNodes();
      let index = nodeIds.indexOf(viewModel.focus.id) - 1;
      if (index < 0) {
        index = nodeIds.length - 1;
      }
      this.controller.focus(nodeIds[index], 'title');
    },

    complete: (id) => {
      if (id === root) {
        return;
      }

      const {firemodel} = this.state;
      this.getNodesRef().child(id).update({complete: !firemodel[id].complete});
      this.controller.nextFocus();
    },

    createSiblingTo: (siblingId) => {
      // TODO: should 'split' node into two...
      const {model, viewModel, firemodel} = this.state;
      const controller = this.controller;

      const nodesRef = this.getNodesRef();

      // Create a new node
      const newNodeId = nodesRef.push({ 'title': '' }).key;

      // Insert node into correct parent
      const parentId = this.controller.helpers.findParentIdTo(siblingId) || 'root';

      // At correct place among children
      let childrenIds = firemodel[parentId].children || [];
      const insertPointIndex = childrenIds.indexOf(siblingId) + 1;
      childrenIds.splice(
        insertPointIndex,
        0,
        newNodeId);

      nodesRef.child(parentId).update({children: childrenIds});

      // Update focus
      controller.expand(parentId);
      controller.focus(newNodeId, 'title');
    },
    indent: (id) => {
      // TODO: broken due to visible/hidden logic
      alert('broken');

      const {firemodel, model, viewModel} = this.state;
      const controller = this.controller;

      const nodesRef = this.getNodesRef();

      const parentId = this.controller.helpers.findParentIdTo(id);

      // Cannot indent without parent
      if (!parentId) {
        return;
      }

      // Find id in parent
      let childrenIds = firemodel[parentId].children || [];
      const idIndex = childrenIds.indexOf(id);

      // Cannot indent without sibling to become new parent above
      if (idIndex <= 0) {
        return;
      }

      // Remove id from old parent
      childrenIds.splice(idIndex, 1);
      nodesRef.child(parentId).update({children: childrenIds});

      // Add to new parent (sibling to id)
      const newParentId = childrenIds[idIndex-1];
      let newChildrenIds = (firemodel[newParentId].children || []);
      newChildrenIds.push(id);
      nodesRef.child(newParentId).update({children: newChildrenIds});

      // Expand new parent
      controller.expand(newParentId);
    },
    outdent: (id) => {
      // TODO: broken due to visible/hidden logic
      alert('broken');

      const {firemodel, model, viewModel} = this.state;
      const controller = this.controller;

      const nodesRef = this.getNodesRef();

      const parentId = this.controller.helpers.findParentIdTo(id);

      // Cannot outdent without parent
      if (!parentId) {
        return;
      }

      const grandParentId = this.controller.helpers.findParentIdTo(parentId);

      // Cannot outdent without grandparent
      if (!grandParentId) {
        return;
      }

      // Find id in parent
      let childrenIds = firemodel[parentId].children || [];
      const idIndex = childrenIds.indexOf(id);

      // Remove id from old parent
      childrenIds.splice(idIndex, 1);
      nodesRef.child(parentId).update({children: childrenIds});

      // Find parent id in grandparent
      let parentChildrenIds = firemodel[grandParentId].children || [];
      const parentIdIndex = parentChildrenIds.indexOf(parentId) + 1;
      parentChildrenIds.splice(
        parentIdIndex,
        0,
        id);

      nodesRef.child(grandParentId).update({children: parentChildrenIds});

      // Expand new parent
      controller.expand(grandParentId);
    }
  };

  render() {
    let {model, viewModel} = this.state;
    let controller = this.controller;

    return (

      <div className='NodesContainer'>
        <KeyHandler keyEventName={'keydown'} keyValue='ArrowDown' onKeyHandle={() => this.controller.nextFocus()} />
        <KeyHandler keyEventName={'keydown'} keyValue='ArrowUp' onKeyHandle={() => this.controller.prevFocus()} />
        {
          model &&
          <Node model={model} viewModel={viewModel} controller={controller}/>
        }
        {
          !model &&
          <LoadingNode />
        }
      </div>
    );
  }
}
