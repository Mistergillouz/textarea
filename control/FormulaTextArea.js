sap.ui.define([
  'sap/m/TextArea',
  'sap/m/TextAreaRenderer',
  'sap/ui/core/Popup'
],
function (TextArea, TextAreaRenderer, Popup) {
  'use strict'

  const FormulaTextArea = TextArea.extend('control.FormulaTextArea', {
    metadata: {
      properties: {
        caretPosition: {
          type: 'int',
          defaultValue: -1
        },
        suggestions: {
          type: 'array',
          defaultValue: null
        }
      },
      aggregations: {},
      events: {
        suggestionSelected: {},
        suggestionsRequested: {}
      }
    },
    renderer: (oRm, oControl) => TextAreaRenderer.render(oRm, oControl)
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
        this.hidePopup()
      }
    })
  }

  FormulaTextArea.prototype.onAfterRendering = function () {
    TextArea.prototype.onAfterRendering.call(this)

    const $textarea = this.$('inner')
    $textarea.on({
      keydown: this._onKeyDown.bind(this)
		 })
  }

  FormulaTextArea.prototype.setSuggestions = function (suggestions) {
    this.setProperty('suggestions', suggestions)
    this._list.getModel().setData(suggestions)
    this._list.removeSelections(true)
    if (suggestions.length) {
      this.showPopup()
    } else {
      this.hidePopup()
    }
  }

  FormulaTextArea.prototype.showPopup = function () {
    if (!this._popup) {
      this._createPopup()
    }
    if (!this._popup.isOpen()) {
      this._popup.open(250, Popup.Dock.BeginBottom, Popup.Dock.BeginTop, this._getTextArea(), null)
    }
  }

  FormulaTextArea.prototype.hidePopup = function () {
    if (this._isPopupOpen()) {
      this._popup.close()
    }
  }

  FormulaTextArea.prototype._createPopup = function () {
    this._popup = new Popup(this._container, false, true, false)
  }

  FormulaTextArea.prototype.getCaretPosition = function () {
    return this._getTextArea().selectionStart
  }

  FormulaTextArea.prototype._onSelectionChanged = function (oEvent) {
    this._onItemSelected(oEvent.getParameter('listItem'))
  }

  FormulaTextArea.prototype._onKeyDown = function (oEvent) {
    console.log(oEvent.keyCode)
    let handled = false; let fireLiveChange = false
    if (this._isPopupOpen()) {
      let item = null
      switch (oEvent.key) {
        case 'ArrowUp':
        case 'ArrowDown':
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

        case 'Escape':
          this.hidePopup()
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

    if (['ArrowLeft', 'ArrowRight'].indexOf(oEvent.key) !== -1) {
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
    this.hidePopup()
    setTimeout(() => this.fireSuggestionSelected({ item }))
  }

  FormulaTextArea.prototype._getTextArea = function () {
    return this.$('inner')[0]
  }

  return FormulaTextArea
})
