import './App.css';

import React, { Component } from 'react';

import KeyHandler from 'react-key-handler';
import Node from './components/Node.js';
import logo from './logo.svg';
import uuid from 'uuid/v4';

class Controller {

}

class App extends Component {
  state = {
    model: {
      id: uuid(),
      title: "Hejsan",
      children: [
        {
          id: uuid(),
          title: "Hejsan",
          children: [
            {
              id: uuid(),
              title: "Hejsan",
              children: [],
            },
            {
              id: uuid(),
              title: "Hejsan",
              children: [],
            }
          ],
        },
        {
          id: uuid(),
          title: "Hejsan",
          children: [],
        }
      ],
    },
    viewModel: {
      focus: {
        id: undefined,
        type: 'title', // 'none'/'title'/...
      },
      expanded: new Set([]),
    }
  }

  controller = {
    helpers: {
      findParentTo: (model, id) => {
        // If id is a direct child of mine, return me!
        if (model.children.find((child) => child.id === id) !== undefined) {
          return model;
        }

        // Search among children
        return model.children.find((child) => this.controller.helpers.findParentTo(child, id) !== undefined);
      },
    },
    changeTitle: (id, newTitle) => {
      let {model} = this.state;

      let recursiveChangeTitle = (model) => {
        if (model.id === id) {
          model.title = newTitle;
        }

        model.children.forEach(recursiveChangeTitle);
      }

      recursiveChangeTitle(model);
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

    blur: () => {
      let {viewModel} = this.state;
      viewModel.focus.id = undefined;
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
        title: "",
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
  }

  render() {
    const {model, viewModel} = this.state;
    return (
      <div className="App">
        <KeyHandler keyEventName={'keydown'} keyValue="ArrowDown" onKeyHandle={() => this.controller.nextFocus()} />
        <KeyHandler keyEventName={'keydown'} keyValue="ArrowUp" onKeyHandle={() => this.controller.prevFocus()} />
        <div className="App-header">
          <h2>Welcome to Tree View</h2>
        </div>
        <Node model={model} viewModel={viewModel} controller={this.controller}/>
      </div>
    );
  }
}

export default App;
