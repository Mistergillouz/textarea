/* eslint-disable max-lines-per-function, no-magic-numbers, max-statements */

sap.ui.define([
  'sap/m/TextArea',
  'sap/m/TextAreaRenderer',
  'sap/ui/core/Popup'
],
function (TextArea, TextAreaRenderer, Popup) {
  'use strict'

  const FormulaTextArea = TextArea.extend('sap.bi.webi.ui.control.FormulaTextArea', {
    metadata: {
      properties: {
        caretPosition: {
          type: 'int',
          defaultValue: -1
        },
        suggestions: {
          type: 'object[]',
          defaultValue: null
        }
      },
      aggregations: {},
      events: {
        suggestionSelected: {},
        suggestionsRequested: {}
      }
    },
    renderer: (oRm, oControl) => {
      TextAreaRenderer.render(oRm, oControl)
    }
  })

  /**
    * Initializes the control.
    */
  FormulaTextArea.prototype.init = function () {
    TextArea.prototype.init.call(this)

    this._list = new sap.m.List({
      mode: 'SingleSelectMaster'
    })

    this._list.addStyleClass('sapUiSizeCompact')
    this._list.attachSelectionChange(this._onSelectionChanged.bind(this))
    const model = new sap.ui.model.json.JSONModel()
    this._list.setModel(model).bindItems('/', new sap.m.StandardListItem({
      icon: '{icon}',
      title: '{text}',
      type: 'Active'
    }))

    this._container = new sap.m.ScrollContainer({
      vertical: true,
      content: this._list
    })

    this._container.addStyleClass('sapWingFormulaTextAreaPopup')
    this.attachBrowserEvent('focusout', (oEvent) => {
      // Hide popup if focus does not go within popup
      if (this._isPopupOpen() && !$.contains(this._container.getDomRef(), oEvent.relatedTarget)) {
        this._hidePopup()
      }
    })
  }

  FormulaTextArea.prototype.onAfterRendering = function () {
    TextArea.prototype.onAfterRendering.call(this)

    const $textarea = this.$('inner')
    $textarea.on({
      keydown: this._onKeyDown.bind(this),
      mousedown: () => setTimeout(() => this.fireLiveChange({ value: this.getValue() }), 0)
    })
  }

  FormulaTextArea.prototype.setSuggestions = function (suggestions) {
    this.setProperty('suggestions', suggestions)
    this._list.getModel().setData(suggestions)
    this._list.removeSelections(true)
    if (suggestions.length) {
      this._showPopup()
    } else {
      this._hidePopup()
    }
  }

  FormulaTextArea.prototype.setSelectionRange = function (start, length) {
    this.setCaretPosition(start)
    this._getTextArea().selectionEnd = start + length
  }

  FormulaTextArea.prototype._createPopup = function () {
    this._popup = new Popup(this._container, false, true, false)
  }

  FormulaTextArea.prototype._fixPopupPosition = function () {
    const rect = this.getDomRef().getBoundingClientRect()
    const domPopup = this._getPopupDom()
    domPopup
      .css('top', Math.floor(rect.y + rect.height))
      .css('left', Math.floor(rect.x))
  }

  FormulaTextArea.prototype._showPopup = function () {
    if (!this._popup) {
      this._createPopup()
    }
    if (!this._popup.isOpen()) {
      this._popup.open(250, Popup.Dock.BeginBottom, Popup.Dock.BeginTop, this._getTextArea(), null)
      this._fixPopupPosition()
    }
  }

  FormulaTextArea.prototype._hidePopup = function () {
    if (this._isPopupOpen()) {
      this._popup.close()
    }
  }

  FormulaTextArea.prototype.getCaretPosition = function () {
    const textarea = this._getTextArea()
    return textarea ? textarea.selectionStart : 0
  }

  FormulaTextArea.prototype.setCaretPosition = function (position) {
    this.setProperty('caretPosition', position, true)
    this._getTextArea().selectionStart = position
    this._getTextArea().selectionEnd = position
  }

  FormulaTextArea.prototype._onSelectionChanged = function (oEvent) {
    this._onItemSelected(oEvent.getParameter('listItem'))
  }

  FormulaTextArea.prototype._onKeyDown = function (oEvent) {
    let handled = false
    let fireLiveChange = false
    if (this._isPopupOpen()) {
      let item = null
      switch (oEvent.key) {
        case 'ArrowUp':
        case 'ArrowDown': {
          const items = this._list.getItems()
          item = this._list.getSelectedItem()
          let index = items.indexOf(item)
          if (index < 0) {
            index = oEvent.key === 'ArrowDown' ? 0 : items.length - 1
          } else {
            index += oEvent.key === 'ArrowDown' ? 1 : -1
            if (index < 0) {
              index = items.length - 1
            } else if (index === items.length) {
              index = 0
            }
          }

          this._list.setSelectedItem(items[index])
          handled = true
          break
        }

        case 'Escape':
          this._hidePopup()
          handled = true
          break

        case 'Enter':
          item = this._list.getSelectedItem()
          if (item) {
            this._onItemSelected(item)
            handled = true
          }
          break

        default:
          break
      }
    } else if (oEvent.keyCode === 32 && oEvent.ctrlKey) {
      this.fireSuggestionsRequested()
    }

    if (oEvent.key === 'ArrowLeft' || oEvent.key === 'ArrowRight') {
      fireLiveChange = true
    }

    if (fireLiveChange) {
      setTimeout(() => this.fireLiveChange({ value: this.getValue() }))
    }
    return !handled
  }

  FormulaTextArea.prototype._isPopupOpen = function () {
    return this._popup && this._popup.isOpen()
  }

  FormulaTextArea.prototype._onItemSelected = function (item) {
    this._hidePopup()
    setTimeout(() => this.fireSuggestionSelected({ item }), 0)
  }

  FormulaTextArea.prototype._getTextArea = function () {
    return this.$('inner')[0]
  }

  FormulaTextArea.prototype._getPopupDom = function () {
    return this._popup._$()
  }

  return FormulaTextArea
})
