/* Copyright 2016 Mozilla Foundation
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
    define('pdfjs-web/pdf_cursor_tools', ['exports', 'pdfjs-web/grab_to_pan',
      'pdfjs-web/preferences'], factory);
  } else if (typeof exports !== 'undefined') {
    factory(exports, require('./grab_to_pan.js'), require('./preferences.js'));
  } else {
    factory((root.pdfjsWebPdfCursorTools = {}), root.pdfjsWebGrabToPan,
      root.pdfjsWebPreferences);
  }
}(this, function (exports, grabToPan, preferences) {

var GrabToPan = grabToPan.GrabToPan;
var Preferences = preferences.Preferences;

var CursorTool = {
  SELECT: 0, // The default value.
  HAND: 1,
  ZOOM: 2,
};

/**
 * @typedef {Object} PDFCursorToolsOptions
 * @property {HTMLDivElement} container - The document container.
 * @property {EventBus} eventBus - The application event bus.
 */

/**
 * @class
 */
var PDFCursorTools = (function PDFCursorToolsClosure() {
  /**
   * @constructs PDFCursorTools
   * @param {PDFCursorToolsOptions} options
   */
  function PDFCursorTools(options) {
    var self = this;
    this.container = options.container;
    this.eventBus = options.eventBus;

    this.active = CursorTool.SELECT;
    this.activeBeforePresentationMode = null;

    this.handTool = new GrabToPan({
      element: this.container,
    });

    this._addEventListeners();

    // Attempt to convert the old 'enableHandToolOnLoad' preference to the new
    // 'cursorToolOnLoad' preference. Note that this is only done when the new
    // preference has not yet been set to a non-default value.
    // TODO: Remove this fallback after a suitable time has passed.
    Promise.all([Preferences.get('enableHandToolOnLoad'),
                 Preferences.get('cursorToolOnLoad')]).then(function (values) {
      var handToolPref = values[0];
      var cursorToolPref = values[1];

      if (handToolPref === true) {
        // Reset the old preference.
        Preferences.set('enableHandToolOnLoad', false);
        // Update the new preference.
        if (cursorToolPref === CursorTool.SELECT) {
          Preferences.set('cursorToolOnLoad', cursorToolPref);
          cursorToolPref = CursorTool.HAND;
        }
      }
      self.switchTool(cursorToolPref);
    }).catch(function (reason) { });
  }

  PDFCursorTools.prototype = {
    /**
     * @returns {number} One of the values in `CursorTool`.
     */
    get activeTool() {
      return this.active;
    },

    /**
     * NOTE: This method is ignored while Presentation Mode is active.
     * @param {number} tool - The cursor mode that should be switched to,
     *                        must be one of the values in `CursorTool`.
     */
    switchTool: function PDFCursorTools_switchTool(tool) {
      if (this.activeBeforePresentationMode !== null) {
        return; // Cursor tools cannot be used in Presentation Mode.
      }
      if (tool === this.active) {
        return; // The requested tool is already active.
      }

      // De-activate the currently active cursor tool.
      switch (this.active) {
        case CursorTool.HAND:
          this.handTool.deactivate();
          break;
        case CursorTool.ZOOM:
          /* falls through */
      }

      // Activate the new cursor tool.
      switch (tool) {
        case CursorTool.SELECT:
          break;
        case CursorTool.HAND:
          this.handTool.activate();
          break;
        case CursorTool.ZOOM:
          /* falls through */
        default:
          console.error('PDFCursorTools_switchTools: "' + tool +
                        '" is an unsupported value.');
          return;
      }
      // Update the active tool *after* it has been validated above,
      // in order to prevent setting it to an invalid state.
      this.active = tool;

      this._dispatchEvent();
    },

    /**
     * @private
     */
    _dispatchEvent: function PDFCursorTools_dispatchEvent() {
      this.eventBus.dispatch('cursortoolchanged', {
        source: this,
        tool: this.active,
      });
    },

    /**
     * @private
     */
    _addEventListeners: function PDFCursorTools_addEventListeners() {
      var self = this;

      self.eventBus.on('switchcursortool', function (evt) {
        self.switchTool(evt && evt.tool);
      });

      self.eventBus.on('presentationmodechanged', function (evt) {
        if (evt.switchInProgress) {
          return;
        }
        var previouslyActive;

        if (evt.active) {
          previouslyActive = self.active;

          self.switchTool(CursorTool.SELECT);
          self.activeBeforePresentationMode = previouslyActive;
        } else {
          previouslyActive = self.activeBeforePresentationMode;

          self.activeBeforePresentationMode = null;
          self.switchTool(previouslyActive);
        }
      });
    },
  };

  return PDFCursorTools;
})();

exports.PDFCursorTools = PDFCursorTools;
exports.CursorTool = CursorTool;
}));
