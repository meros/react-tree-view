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
      findParentIdTo: (id) => {
        let firemodel = this.state.firemodel || {};

        return Object.keys(firemodel).find((potentialParentId) => {
          const children = firemodel[potentialParentId].children || [];
          return children.indexOf(id) != -1;
        });
      },
      findSiblingIdsTo: (id) => {
        let firemodel = this.state.firemodel || {};

        let parentId = this.controller.helpers.findParentIdTo(id);
        if (!parentId) {
          return undefined;
        }

        return firemodel[parentId].children || [];
      },
      find: (model, id) => {

        if (model.id === id) {
          return model;
        }

        for (var i in model.children) {
          let child = model.children[i];
          let result = this.controller.helpers.find(child, id);
          if (result !== undefined) {
            return result;
          }
        }

        return undefined;
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
      let {model, viewModel} = this.state;

      let found = false;

      let recursiveNextFocus = (model) => {
        if (found || viewModel.focus.id === undefined) {
          found = false;
          viewModel.focus.id = model.id;
          viewModel.focus.type = 'title';
          return;
        }

        if (viewModel.focus.id === model.id) {
          found = true;
        }

        if (viewModel.expanded.has(model.id)) {
          model.children.forEach(recursiveNextFocus);
        }
      };

      recursiveNextFocus(model);
      this.setState({ viewModel });
    },

    prevFocus: () => {
      let {model, viewModel} = this.state;

      let lastbeforefound = model.id;
      let found = false;

      let recursivePrevFocus = (model) => {
        if (found || model.id === viewModel.focus.id) {
          found = true;
          return;
        }

        lastbeforefound = model.id;

        if (viewModel.expanded.has(model.id)) {
          model.children.forEach(recursivePrevFocus);
        }
      };

      recursivePrevFocus(model);

      viewModel.focus.id = lastbeforefound;
      viewModel.focus.type = 'title';

      this.setState({ viewModel });
    },

    complete: (id) => {
      if (id === root) {
        return;
      }

      const {firemodel} = this.state;
      this.getNodesRef().child(id).update({complete: !firemodel[id].complete});
    },

    createSiblingTo: (siblingId) => {
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
      let newChildrenIds = firemodel[newParentId].children || [];
      newChildrenIds.push(id);
      nodesRef.child(newParentId).update({children: newChildrenIds});

      // Expand new parent
      controller.expand(newParentId);
    },
    outdent: (id) => {
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
