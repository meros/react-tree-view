import './App.css';

import React, { Component } from 'react';

import KeyHandler from 'react-key-handler';
import Node from './components/Node.js';
import equal from 'deep-equal';
import fire from './fire';
import logo from './logo.svg';
import uuid from 'uuid/v4';

class Controller {

}

class App extends Component {
  state = {
    model: undefined,
    viewModel: {
      focus: {
        id: undefined,
        type: 'title', // 'none'/'title'/...
      },
      expanded: new Set([]),
    }
  }

  componentDidMount() {
    /* Create reference to messages in Firebase Database */
    let root = fire.database().ref('nodes');
    let that = this;

    root.once('value', (snapshot) => {
      // TODO: cannot store in DB like this! Need to flatten it!
      let value = snapshot.val();

      let recurseFixNode = (node) => {
        if (node.children instanceof Array) {
          node.children.forEach((child) => {
            recurseFixNode(child);
          });
        } else {
          node.children = [];
        }
      }

      recurseFixNode(value);

      console.log(value, that.state.model);

      if (equal(value, that.state.model)) {
        return;
      }

      that.setState({model: value});
    });
  }

  componentWillUpdate(nextProps, nextState) {
    let {model} = this.state;

    if (model === undefined) {
      return;
    }

    fire.database().ref('root').set(model);
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
      let {model} = this.state;

      let modelUnderAction = this.controller.helpers.find(model, id);
      if (modelUnderAction === undefined) {
        return;
      }

      modelUnderAction.title = newTitle;
      this.setState({ model });
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
      let parentToId = this.controller.helpers.findParentTo(model, id) || model;

      let index = parentToId.children.findIndex((child) => child.id === id) +  1;
      let newChild = {
        id: uuid(),
        title: '',
        children: [],
      };

      parentToId.children.splice(
        index,
        0,
        newChild);

      viewModel.focus.id = newChild.id;
      viewModel.focus.type = 'title';

      this.setState({model, viewModel});
    },
    indent: (id) => {
      let {model} = this.state;

      let parent = this.controller.helpers.findParentTo(model, id);
      if (parent === undefined) {
        return;
      }

      let index = parent.children.findIndex((child) => (child.id === id));
      if (index <= 0) {
        return;
      }

      let modelUnderAction = parent.children[index];


      parent.children.splice(index, 1);

      parent.children[index-1].children.push(modelUnderAction);
      this.controller.expand(parent.children[index-1].id);
      this.setState({model});
    },
    outdent: (id) => {
      let {model} = this.state;

      let parent = this.controller.helpers.findParentTo(model, id);
      if (parent === undefined) {
        return;
      }

      let grandParent = this.controller.helpers.findParentTo(model, parent.id);
      if (grandParent === undefined) {
        return;
      }

      let index = parent.children.findIndex((child) => (child.id === id));
      if (index < 0) {
        return;
      }

      let parentIndex = grandParent.children.findIndex((child) => (child.id === parent.id));
      if (parentIndex < 0) {
        return;
      }

      let modelUnderAction = parent.children[index];

      parent.children.splice(index, 1);

      grandParent.children.splice(parentIndex+1, 0, modelUnderAction);
      this.setState({model});
    }
  }

  render() {
    const {model, viewModel} = this.state;
    return (
      <div className='App'>
        <KeyHandler keyEventName={'keydown'} keyValue='ArrowDown' onKeyHandle={() => this.controller.nextFocus()} />
        <KeyHandler keyEventName={'keydown'} keyValue='ArrowUp' onKeyHandle={() => this.controller.prevFocus()} />
        <div className='App-header'>
          <h2>Welcome to Tree View</h2>
        </div>
        {
          model !== undefined &&
          <Node model={model} viewModel={viewModel} controller={this.controller}/>
        }
      </div>
    );
  }
}

export default App;
