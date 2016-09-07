/* Copyright 2012 Mozilla Foundation
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

'use strict';

(function (root, factory) {
  if (typeof define === 'function' && define.amd) {
    define('pdfjs-web/secondary_toolbar', ['exports', 'pdfjs-web/ui_utils',
      'pdfjs-web/pdf_cursor_tools'], factory);
  } else if (typeof exports !== 'undefined') {
    factory(exports, require('./ui_utils.js'),
     require('./pdf_cursor_tools.js'));
  } else {
    factory((root.pdfjsWebSecondaryToolbar = {}), root.pdfjsWebUIUtils,
      root.pdfjsWebPdfCursorTools);
  }
}(this, function (exports, uiUtils, pdfCursorTools) {

var SCROLLBAR_PADDING = uiUtils.SCROLLBAR_PADDING;
var CursorTool = pdfCursorTools.CursorTool;

/**
 * @typedef {Object} SecondaryToolbarOptions
 * @property {HTMLDivElement} toolbar - Container for the secondary toolbar.
 * @property {HTMLButtonElement} toggleButton - Button to toggle the visibility
 *   of the secondary toolbar.
 * @property {HTMLDivElement} toolbarButtonContainer - Container where all the
 *   toolbar buttons are placed. The maximum height of the toolbar is controlled
 *   dynamically by adjusting the 'max-height' CSS property of this DOM element.
 * @property {HTMLButtonElement} presentationModeButton - Button for entering
 *   presentation mode.
 * @property {HTMLButtonElement} openFileButton - Button to open a file.
 * @property {HTMLButtonElement} printButton - Button to print the document.
 * @property {HTMLButtonElement} downloadButton - Button to download the
 *   document.
 * @property {HTMLLinkElement} viewBookmarkButton - Button to obtain a bookmark
 *   link to the current location in the document.
 * @property {HTMLButtonElement} firstPageButton - Button to go to the first
 *   page in the document.
 * @property {HTMLButtonElement} lastPageButton - Button to go to the last page
 *   in the document.
 * @property {HTMLButtonElement} pageRotateCwButton - Button to rotate the pages
 *   clockwise.
 * @property {HTMLButtonElement} pageRotateCcwButton - Button to rotate the
 *   pages counterclockwise.
 * @property {HTMLButtonElement} cursorSelectToolButton - Button to enable the
 *   select tool.
 * @property {HTMLButtonElement} cursorHandToolButton - Button to enable the
 *   hand tool.
 * @property {HTMLButtonElement} documentPropertiesButton - Button for opening
 *   the document properties dialog.
 */

/**
 * @class
 */
var SecondaryToolbar = (function SecondaryToolbarClosure() {
  /**
   * @constructs SecondaryToolbar
   * @param {SecondaryToolbarOptions} options
   * @param {HTMLDivElement} mainContainer
   * @param {EventBus} eventBus
   */
  function SecondaryToolbar(options, mainContainer, eventBus) {
    this.toolbar = options.toolbar;
    this.toggleButton = options.toggleButton;
    this.toolbarButtonContainer = options.toolbarButtonContainer;
    this.buttons = [
      { element: options.presentationModeButton, eventName: 'presentationmode',
        close: true },
      { element: options.openFileButton, eventName: 'openfile', close: true },
      { element: options.printButton, eventName: 'print', close: true },
      { element: options.downloadButton, eventName: 'download', close: true },
      { element: options.viewBookmarkButton, eventName: null, close: true },
      { element: options.firstPageButton, eventName: 'firstpage', close: true },
      { element: options.lastPageButton, eventName: 'lastpage', close: true },
      { element: options.pageRotateCwButton, eventName: 'rotatecw',
        close: false },
      { element: options.pageRotateCcwButton, eventName: 'rotateccw',
        close: false },
      { element: options.cursorSelectToolButton, eventName: 'switchcursortool',
        eventDetails: { tool: CursorTool.SELECT, }, close: true },
      { element: options.cursorHandToolButton, eventName: 'switchcursortool',
        eventDetails: { tool: CursorTool.HAND, }, close: true },
      { element: options.documentPropertiesButton,
        eventName: 'documentproperties', close: true }
    ];
    this.items = {
      firstPage: options.firstPageButton,
      lastPage: options.lastPageButton,
      pageRotateCw: options.pageRotateCwButton,
      pageRotateCcw: options.pageRotateCcwButton,
    };

    this.mainContainer = mainContainer;
    this.eventBus = eventBus;

    this.opened = false;
    this.containerHeight = null;
    this.previousContainerHeight = null;

    this.reset();

    // Bind the event listeners for click and cursor tool actions.
    this._bindClickListeners();
    this._bindCursorToolsListener(options);

    // Bind the event listener for adjusting the 'max-height' of the toolbar.
    this.eventBus.on('resize', this._setMaxHeight.bind(this));
  }

  SecondaryToolbar.prototype = {
    /**
     * @return {boolean}
     */
    get isOpen() {
      return this.opened;
    },

    setPageNumber: function SecondaryToolbar_setPageNumber(pageNumber) {
      this.pageNumber = pageNumber;
      this._updateUIState();
    },

    setPagesCount: function SecondaryToolbar_setPagesCount(pagesCount) {
      this.pagesCount = pagesCount;
      this._updateUIState();
    },

    reset: function SecondaryToolbar_reset() {
      this.pageNumber = 0;
      this.pagesCount = 0;
      this._updateUIState();
    },

    _updateUIState: function SecondaryToolbar_updateUIState() {
      var items = this.items;

      items.firstPage.disabled = (this.pageNumber <= 1);
      items.lastPage.disabled = (this.pageNumber >= this.pagesCount);
      items.pageRotateCw.disabled = this.pagesCount === 0;
      items.pageRotateCcw.disabled = this.pagesCount === 0;
    },

    _bindClickListeners: function SecondaryToolbar_bindClickListeners() {
      // Button to toggle the visibility of the secondary toolbar.
      this.toggleButton.addEventListener('click', this.toggle.bind(this));

      // All items within the secondary toolbar.
      for (var button in this.buttons) {
        var element = this.buttons[button].element;
        var eventName = this.buttons[button].eventName;
        var eventDetails = this.buttons[button].eventDetails || null;
        var close = this.buttons[button].close;

        element.addEventListener('click', function (eventName, eventDetails,
                                                    close) {
          if (eventName !== null) {
            var details = { source: this, };
            for (var property in eventDetails) {
              details[property] = eventDetails[property];
            }
            this.eventBus.dispatch(eventName, details);
          }
          if (close) {
            this.close();
          }
        }.bind(this, eventName, eventDetails, close));
      }
    },

    _bindCursorToolsListener:
        function SecondaryToolbar_bindCursorToolListener(buttons) {
      this.eventBus.on('cursortoolchanged', function (e) {
        buttons.cursorSelectToolButton.classList.remove('toggled');
        buttons.cursorHandToolButton.classList.remove('toggled');

        switch (e.tool) {
          case CursorTool.SELECT:
            buttons.cursorSelectToolButton.classList.add('toggled');
            break;
          case CursorTool.HAND:
            buttons.cursorHandToolButton.classList.add('toggled');
            break;
        }
      });
    },

    open: function SecondaryToolbar_open() {
      if (this.opened) {
        return;
      }
      this.opened = true;
      this._setMaxHeight();

      this.toggleButton.classList.add('toggled');
      this.toolbar.classList.remove('hidden');
    },

    close: function SecondaryToolbar_close() {
      if (!this.opened) {
        return;
      }
      this.opened = false;
      this.toolbar.classList.add('hidden');
      this.toggleButton.classList.remove('toggled');
    },

    toggle: function SecondaryToolbar_toggle() {
      if (this.opened) {
        this.close();
      } else {
        this.open();
      }
    },

    /**
     * @private
     */
    _setMaxHeight: function SecondaryToolbar_setMaxHeight() {
      if (!this.opened) {
        return; // Only adjust the 'max-height' if the toolbar is visible.
      }
      this.containerHeight = this.mainContainer.clientHeight;

      if (this.containerHeight === this.previousContainerHeight) {
        return;
      }
      this.toolbarButtonContainer.setAttribute('style',
        'max-height: ' + (this.containerHeight - SCROLLBAR_PADDING) + 'px;');

      this.previousContainerHeight = this.containerHeight;
    }
  };

  return SecondaryToolbar;
})();

exports.SecondaryToolbar = SecondaryToolbar;
}));
