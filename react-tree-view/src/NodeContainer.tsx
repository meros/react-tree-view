import "./NodesContainer.css";

import * as React from "react";

import update from "immutability-helper";
// @ts-ignore
import KeyHandler from "react-key-handler";

import LoadingNode from "./components/LoadingNode";
import Node from "./components/Node";
import { IViewModel } from "./components/Node";
import Path from "./components/Path";
import fire from "./fire";

interface IFireNode {
  title: string;
  completeStatus: "complete" | "recentlyCompleted" | "uncomplete";
  children: string[];
}

interface IFireModel {
  [nodeid: string]: IFireNode;
}

interface IProps {
  user: any;
}

interface IState {
  firemodel: IFireModel;
  viewOptions: {
    focus: {
      id: string | void;
      type: "title";
    };
    expanded: any;
    hideCompleted: boolean;
    rootNode: string;
  };
}

export default class NodeContainer extends React.Component<IProps, IState> {
  public state: IState = {
    // Original data from firebase
    firemodel: {},

    // Options governing the translation between firemodel -> viewModel
    viewOptions: {
      focus: {
        id: undefined,
        type: "title" // 'none'/'title'/...
      },

      expanded: new Set([]),
      hideCompleted: true,
      rootNode: "root"
    }
  };

  public controller = {
    changeTitle: (id: string, newTitle: string) => {
      this.getNodesRef()
        .child(id)
        .update({ title: newTitle });
    },

    toggleExpand: (id: string) => {
      const { viewOptions } = this.state;

      if (viewOptions.expanded.has(id)) {
        viewOptions.expanded.delete(id);
      } else {
        viewOptions.expanded.add(id);
      }

      this.setState({ viewOptions });
    },

    collapse: (id: string) => {
      const { viewOptions } = this.state;
      viewOptions.expanded.delete(id);
      this.setState({ viewOptions });
    },

    expand: (id: string) => {
      const { viewOptions } = this.state;
      viewOptions.expanded.add(id);
      this.setState({ viewOptions });
    },

    dragUp: (id: string) => {
      const { firemodel, viewOptions } = this.state;

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
      const { firemodel } = this.state;

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
      const { viewOptions } = this.state;

      if (viewOptions.focus.id !== id) {
        return;
      }

      viewOptions.focus.id = undefined;
      this.setState({ viewOptions });
    },

    focus: (id: string, type: "title") => {
      const { viewOptions } = this.state;

      if (id === viewOptions.focus.id && viewOptions.focus.type === type) {
        return;
      }

      viewOptions.focus.id = id;
      viewOptions.focus.type = type;

      this.setState({ viewOptions });
    },
    nextFocus: (skipDirectChildrenOf?: string) => {
      const { viewOptions } = this.state;

      // In some cases, we don't want to focus first child, but rather next sibling
      // When completing a subtree for instance...
      const flattened = this.getVisibleNodeIdsFlattened(skipDirectChildrenOf);

      if (!viewOptions.focus.id) {
        return;
      }

      const index =
        (flattened.indexOf(viewOptions.focus.id) + 1) % flattened.length;

      if (!flattened[index]) {
        return;
      }

      this.controller.focus(flattened[index], "title");
    },
    prevFocus: () => {
      const { viewOptions } = this.state;
      const flattened = this.getVisibleNodeIdsFlattened();

      if (!viewOptions.focus.id) {
        return;
      }

      let index =
        (flattened.indexOf(viewOptions.focus.id) - 1) % flattened.length;
      if (index < 0) {
        index = flattened.length - 1;
      }

      if (!flattened[index]) {
        return;
      }

      this.controller.focus(flattened[index], "title");
    },
    complete: (id: string) => {
      const { firemodel } = this.state;

      if (!firemodel) {
        return;
      }

      const wasComplete = firemodel[id].completeStatus === "uncomplete";
      const nodeRef = this.getNodesRef().child(id);

      nodeRef.update({
        completeStatus: wasComplete ? "recentlyCompleted" : "uncomplete"
      });

      if (wasComplete) {
        setTimeout(() => {
          nodeRef.once("value").then((snapshot: any) => {
            if (snapshot.val().completeStatus !== "recentlyCompleted") {
              return;
            }

            nodeRef.update({
              completeStatus: "complete"
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

      const siblingIds = firemodel[parentId].children || [];
      const siblingIndex = siblingIds.indexOf(siblingId);

      // Create new node
      const newNode: IFireNode = {
        title: "",
        completeStatus: "uncomplete",
        children: []
      };
      const newNodeRef = this.getNodesRef().push(newNode);
      if (!newNodeRef.key) {
        return;
      }

      // Set focus!
      this.controller.focus(newNodeRef.key, "title");

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
      const siblingIds = firemodel[parentId].children || [];

      // Check if there is a valid VISIBLE sibling to make new parent
      const flattenVisibleNodes = this.getVisibleNodeIdsFlattened();
      const visibleSiblingIds = siblingIds.filter(
        visibleSiblingId => flattenVisibleNodes.indexOf(visibleSiblingId) !== -1
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
      const newSiblingIds = firemodel[newParentId].children || [];
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
      const siblingIds = firemodel[parentId].children || [];
      const siblingIndex = siblingIds.indexOf(id);

      // Remove from old parent!
      siblingIds.splice(siblingIndex, 1);
      this.getNodesRef()
        .child(parentId)
        .update({ children: siblingIds });

      // Find our place among the new siblings
      const parentSiblingIds = firemodel[grandParentId].children || [];
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
        viewOptions: update(viewOptions, { rootNode: { $set: id } })
      });
    },
    zoomOut: (id: string) => {
      const { viewOptions } = this.state;

      this.setState({
        viewOptions: update(viewOptions, {
          rootNode: {
            $set: this.getParentIdTo(viewOptions.rootNode) || "root"
          }
        })
      });
    }
  };

  public getNodesRef() {
    const { user } = this.props;
    return fire
      .database()
      .ref("users")
      .child(user.uid)
      .child("nodes");
  }

  public componentDidMount() {
    /* Create reference to messages in Firebase Database */
    this.getNodesRef().on("value", (snapshot: any) => {
      const firemodel = snapshot.val();
      this.setState({ firemodel });

      // Inject root
      const newNode: IFireNode = {
        children: [],
        completeStatus: "uncomplete",
        title: "Welcome to TreeView!"
      };
      if (!firemodel) {
        this.getNodesRef()
          .child("root")
          .set(newNode);
      }
    });
  }

  public getParentIdTo(id: string) {
    const { firemodel } = this.state;
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

  public getPathModel() {
    const { firemodel, viewOptions } = this.state;

    if (!firemodel) {
      return [];
    }

    const result = [];
    let currNode: string | void = viewOptions.rootNode;

    while (currNode && currNode !== "root") {
      if (firemodel[currNode]) {
        const pathNode = {
          id: currNode,
          title: firemodel[currNode].title
        };

        result.unshift(pathNode);
      }
      currNode = this.getParentIdTo(currNode);
    }

    return result;
  }

  public getViewModel(): IViewModel | void {
    const { firemodel, viewOptions } = this.state;

    if (!firemodel) {
      return undefined;
    }

    const recursive = (id: string, node: IFireNode) => {
      // Create viewModel
      const viewModel: IViewModel = {
        id,
        title: node.title,
        strikethrough: node.completeStatus !== "uncomplete",
        focus: "none",
        children: [],
        expandCapability: "none"
      };

      if (viewOptions.focus.id === id) {
        viewModel.focus = viewOptions.focus.type;
      }

      // Make sure children only include visible children, but is always an array
      const childrenIds = (node.children || [])
        .filter((childId: string) => firemodel[childId])
        .filter(
          (childId: string) =>
            !(
              firemodel[childId].completeStatus === "complete" &&
              viewOptions.hideCompleted
            )
        );

      viewModel.expandCapability = "none";
      if (childrenIds.length > 0) {
        viewModel.expandCapability = "expand";
      }

      // If node is not expanded, hide children
      const expandedChildren = viewOptions.expanded.has(id) ? childrenIds : [];
      if (expandedChildren.length > 0) {
        viewModel.expandCapability = "collapse";
      }

      viewModel.children = expandedChildren.map((childId: string) =>
        recursive(childId, firemodel[childId])
      );

      return viewModel;
    };
    const rootNode = firemodel[viewOptions.rootNode];
    if (!rootNode) {
      return undefined;
    }

    return recursive(viewOptions.rootNode, rootNode);
  }

  public getVisibleNodeIdsFlattened(skipChildrenOfId?: string) {
    const { firemodel } = this.state;
    if (!firemodel) {
      return [];
    }

    const viewModel = this.getViewModel();

    if (!viewModel) {
      return [];
    }

    const flatten = (viewModel: IViewModel): string[] => {
      if (skipChildrenOfId && viewModel.id === skipChildrenOfId) {
        return [viewModel.id];
      }

      return [].concat.apply(
        [viewModel.id],
        viewModel.children.map((child: IViewModel) => flatten(child))
      );
    };

    return flatten(viewModel);
  }

  public render() {
    const controller = this.controller;
    const viewModel = this.getViewModel();
    const { viewOptions } = this.state;
    const pathModel = this.getPathModel();
    return (
      <div className="NodesContainer">
        {viewOptions.rootNode !== "root" && <Path pathModel={pathModel} />}
        {viewOptions.rootNode !== "root" && (
          <div className="NodesContainer__pathspacer" />
        )}
        <KeyHandler
          keyEventName={"keydown"}
          keyValue="ArrowDown"
          onKeyHandle={() => this.controller.nextFocus()}
        />
        <KeyHandler
          keyEventName={"keydown"}
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
