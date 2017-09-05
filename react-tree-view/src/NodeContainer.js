import React, { Component } from 'react';

import KeyHandler from 'react-key-handler';
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
      findParentTo: (model, id) => {
        // If id is a direct child of mine, return me!
        if (model.children.find((child) => (child.id === id)) !== undefined) {
          return model;
        }

        for (var i in model.children) {
          let child = model.children[i];
          let result = this.controller.helpers.findParentTo(child, id);
          if (result !== undefined) {
            return result;
          }
        }

        return undefined;
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

    createSiblingTo: (id) => {
      let {model, viewModel} = this.state;
      let nodesRef = this.getNodesRef();

      let newNodeRef = nodesRef.push({ 'title': '' });
      let newNodeId = newNodeRef.key;

      let parentModel = this.controller.helpers.findParentTo(model, id) || model;
      let parentId = parentModel.id;
      let parentRef = nodesRef.child(parentId);

      parentRef.once('value', (snapshot) => {
        let childrenIds = snapshot.val().children || [];

        let index = childrenIds.indexOf(id) + 1;
        childrenIds.splice(
          index,
          0,
          newNodeId);
        parentRef.update({children: childrenIds});
      })


      viewModel.focus.id = newNodeId;
      viewModel.focus.type = 'title';

      this.controller.expand(parentId);
      this.setState({viewModel});
    },
    indent: (id) => {
      let {model, viewModel} = this.state;
      let controller = this.controller;
      let nodesRef = this.getNodesRef();

      let parentModel = this.controller.helpers.findParentTo(model, id);
      let parentId = parentModel.id;
      let parentRef = nodesRef.child(parentId);

      parentRef.once('value')
        .then((snapshot) => {
          let childrenIds = snapshot.val().children || [];
          let idx = childrenIds.indexOf(id);
          if (idx <= 0) {
            return;
          }

          childrenIds.splice(idx, 1);
          parentRef.update({children: childrenIds});

          let newParentId = childrenIds[idx-1];
          let newParentRef = nodesRef.child(newParentId);

          newParentRef.once('value')
            .then((snapshot) => {
              let newChildrenIds = snapshot.val().children || [];
              newChildrenIds.push(id);
              newParentRef.update({children: newChildrenIds});

              controller.expand(newParentId);
            });
        });
    },
    outdent: (id) => {
      alert('Not implemented');
    }
  };


  render() {
    let {model, viewModel} = this.state;
    let controller = this.controller;

    return (

      <div>
        <KeyHandler keyEventName={'keydown'} keyValue='ArrowDown' onKeyHandle={() => this.controller.nextFocus()} />
        <KeyHandler keyEventName={'keydown'} keyValue='ArrowUp' onKeyHandle={() => this.controller.prevFocus()} />

        {
          model &&
          <Node model={model} viewModel={viewModel} controller={controller}/>
        }
      </div>
    );
  }
}
