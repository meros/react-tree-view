// @flow

import './HelpModal.css';

import React, { Component } from 'react';

import Draggable from 'react-draggable';
import cx from 'classnames';

// TODO: make nice/complete

export default class HelpModal extends Component {
  render() {
    const info = [
      ['Focus next', 'Arrow down'],
      ['Focus prev', 'Arrow up'],
      ['Expand', 'Meta + arrow down'],
      ['Collapse', 'Meta + arrow up'],
      ['Create new', 'Enter'],
      ['Drag up', 'Shift + meta + arrow up'],
      ['Drag down', 'Shift + meta + arrow down'],
      ['Indent', 'Tab'],
      ['Outdent', 'Shift + tab'],
      ['Mark complete', 'Meta + enter'],
      ['Zoom in', 'Meta + arrow right'],
      ['Zoom out', 'Meta + arrow left'],
    ];

    return (
      <Draggable>
        <div className="HelpModal">
          <div className="HelpModal__header">Keyboard shortcuts</div>
          <table className="HelpModal__gridcontainer">
            {info.map((row, y) => (
              <tr>
                {row.map((cell, x) => (
                  <td>
                    <div
                      className={cx('HelpModal__cellcontent', {
                        'HelpModal__cellcontent--odd': y % 2 !== 0,
                      })}>
                      {cell}
                    </div>
                  </td>
                ))}
              </tr>
            ))}
          </table>
        </div>
      </Draggable>
    );
  }
}
