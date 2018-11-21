sap.ui.define([
   'sap/ui/core/Control',
   'sap/ui/core/Popup'
],
   function (Control, Popup) {
      "use strict";

      const FormulaEditor = Control.extend('control.FormulaEditor', {
         metadata: {
            properties: {
               value: { type: 'string', defaultValue: '' },
               caretPosition: { type: 'int', defaultValue: 0 },
               suggestions: { type: 'array', defaultValue: null },
               highlights: { type: 'array', defaultValue: null },
               rows: { type: 'int', defaultValue: 2 },
               growingMaxLines: { type: 'int', defaultValue: 0 },
               width: { type: 'sap.ui.core.CSSSize', defaultValue: '100%' },
               height: { type: 'sap.ui.core.CSSSize', defaultValue: 'auto' },
               allowEnter: { type: 'boolean', defaultValue: true },
               scrollPosition: { type: 'object', defaultValue: null }
            },
            aggregations: {},
            events: {
               suggestionSelected: {},
               suggestionsRequested: {},
               liveChange: {}
            }
         },
         renderer: (oRm, self) => self._render(oRm)
      })

      FormulaEditor.prototype.init = function () {
         Control.prototype.init.call(this)
         this.addStyleClass('sapMInputBase sapMText sapMTextArea sapMTextAreaInner sapMInputBaseContentWrapper')

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
      }

      FormulaEditor.prototype._render = function (oRm) {
         oRm.write('<div')

         oRm.addStyle('width', this.getWidth())
         oRm.addStyle('height', this.getHeight())
         oRm.writeStyles()

         oRm.addClass('wingFormulaEditor')
         oRm.writeClasses(this)

         oRm.writeControlData(this)
         oRm.write(">")

         oRm.write(`<div contenteditable spellcheck="false" class="wingFormulaEditor-inner" id="${this._getInnerId()}">`)
         oRm.write(this._getValueHtml())
         oRm.write("</div>")
         oRm.write("</div>")
      }

      FormulaEditor.prototype.onAfterRendering = function () {
         console.log('onAfterRendering')
         Control.prototype.onAfterRendering.call(this);

         const inner = $(`#${this._getInnerId()}`)
         const growingMaxLines = this.getGrowingMaxLines()
         if (!isNaN(growingMaxLines)) {
            const fontHeight = parseInt(window.getComputedStyle(inner[0]).fontSize, 10)
            inner.css('max-height', `${fontHeight * growingMaxLines}px`)
         }

         const rows = this.getRows()
         if (!isNaN(rows)) {
            const fontHeight = parseInt(window.getComputedStyle(inner[0]).fontSize, 10)
            inner.css('min-height', `${fontHeight * rows}px`)
         }

         const $textarea = $('#' + this._getInnerId())
         $textarea.on({
            keydown: (oEvent) => this._onKeyDown(oEvent),
            mousedown: () => this._afterKeydown(true, true)
         })

         this.attachBrowserEvent('focusout', (oEvent) => {
            if (this._isPopupOpen() && !$.contains(this._container.getDomRef(), oEvent.relatedTarget)) {
               this._hidePopup()
            }
         })

         this._setCaretPosition(this._getTextArea(), this.getCaretPosition())
         this._setScrollPosition(this.getScrollPosition())
      }
     
      FormulaEditor.prototype.setSuggestions = function (suggestions) {
         this.setProperty('suggestions', suggestions, true)
         this._list.getModel().setData(suggestions)
         this._list.removeSelections(true)
         if (suggestions.length) {
            this._showPopup()
         } else {
            this._hidePopup()
         }
      }

      FormulaEditor.prototype.setCaretPosition = function (caret) {
         this.setProperty('caretPosition', caret, true)
      }

      FormulaEditor.prototype.setScrollPosition = function (position) {
         this.setProperty('scrollPosition', position, true)
      }

      FormulaEditor.prototype._getScrollPosition = function () {
         const textarea = this._getTextArea()
         return {
            left: textarea.scrollLeft,
            top: textarea.scrollTop
         }
      }

      FormulaEditor.prototype._setScrollPosition = function (scroll) {
         if (scroll) {
            const textarea = this._getTextArea()
            textarea.scrollLeft = scroll.left
            textarea.scrollTop = scroll.top
         }
      }
      
      FormulaEditor.prototype._onKeyDown = function (oEvent) {
         let valueChanged = true
         let updateCaret = true
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
                  valueChanged = false
                  break

               case 'Escape':
                  this._hidePopup()
                  valueChanged = false
                  break

               case 'Enter':
                  item = this._list.getSelectedItem()
                  if (item) {
                     this._onItemSelected(item)
                     updateCaret = false
                  }
                  break

               default:
                  break
            }

         } else if (oEvent.keyCode === 32 && oEvent.ctrlKey) {
            this.fireSuggestionsRequested()
            valueChanged = false
         } else if (!this.getAllowEnter() && oEvent.key === 'Enter') {
            valueChanged = false
         }

         this._afterKeydown(valueChanged, updateCaret)
         return valueChanged
      }

      FormulaEditor.prototype._getValueHtml = function () {
         console.log('_getValueHtml')
         const highlights = this.getHighlights() || []
         const text = this.getValue()
         let html = ''

         let start = 0
         highlights.forEach((highlight) => {
            if (start < highlight.start) {
               html += text.substring(start, highlight.start)
            }

            const tooltip = highlight.tooltip ? ` title="${highlight.tooltip}"` : ''
            html += `<span class="${highlight.css}"${tooltip}>${text.substring(highlight.start, highlight.start + highlight.len)}</span>`
            start = highlight.start + highlight.len
         })

         html += text.substring(start)
         return html
      }

      FormulaEditor.prototype._afterKeydown = function (valueChanged, updateCaret) {
         setTimeout(() => {
            if (updateCaret) {
               this.setCaretPosition(this._getCaretPosition())
               this.setScrollPosition(this._getScrollPosition())
            }
   
            if (valueChanged) {
               const value = this._getTextArea().textContent
               this.setProperty('value', value, true)
               this.fireLiveChange({ value })
            }
         }, 0)
      }

      FormulaEditor.prototype._showPopup = function () {
         if (!this._popup) {
            this._createPopup()
         }
         if (!this._popup.isOpen()) {
            this._popup.open(250, Popup.Dock.BeginBottom, Popup.Dock.BeginTop, this)
         }
      }

      FormulaEditor.prototype._createPopup = function () {
         this._popup = new Popup(this._container, false, true, false)
         this._popup.attachOpened(this._onPopupOpened.bind(this))
      }

      FormulaEditor.prototype._hidePopup = function () {
         if (this._isPopupOpen()) {
            this._popup.close()
         }
      }

      FormulaEditor.prototype._isPopupOpen = function () {
         return this._popup && this._popup.isOpen()
      }

      FormulaEditor.prototype._onPopupOpened = function (oEvent) {
         const rect = this.getDomRef().getBoundingClientRect()
         const domPopup = this._popup._$()
         domPopup.css('top', Math.floor(rect.y + rect.height)).css('left', Math.floor(rect.x))
      }

      FormulaEditor.prototype._setCaretPosition = function (el, pos) {
         // Loop through all child nodes
         for (var node of el.childNodes) {
            if (node.nodeType == 3) { // we have a text node
               if (node.length >= pos) {
                  // finally add our range
                  var range = document.createRange(),
                     sel = window.getSelection();
                  range.setStart(node, pos);
                  range.collapse(true);
                  sel.removeAllRanges();
                  sel.addRange(range);
                  return -1; // we are done
               } else {
                  pos -= node.length;
               }
            } else {
               pos = this._setCaretPosition(node, pos);
               if (pos == -1) {
                  return -1; // no need to finish the for loop
               }
            }
         }
         return pos; // needed because of recursion stuff
      }

      FormulaEditor.prototype._getCaretPosition = function () {
         const element = this._getTextArea()
         const doc = element.ownerDocument || element.document;
         const win = doc.defaultView || doc.parentWindow;
         let caretOffset = 0;
         let sel;
         if (typeof win.getSelection !== 'undefined') {
            sel = win.getSelection()
            if (sel.rangeCount > 0) {
               const range = win.getSelection().getRangeAt(0)
               const preCaretRange = range.cloneRange()
               preCaretRange.selectNodeContents(element)
               preCaretRange.setEnd(range.endContainer, range.endOffset)
               caretOffset = preCaretRange.toString().length
            }
         } else if ((sel = doc.selection) && sel.type != 'Control') {
            var textRange = sel.createRange()
            var preCaretTextRange = doc.body.createTextRange()
            preCaretTextRange.moveToElementText(element)
            preCaretTextRange.setEndPoint('EndToEnd', textRange)
            caretOffset = preCaretTextRange.text.length
         }
         return caretOffset;
      }

      FormulaEditor.prototype._onSelectionChanged = function (oEvent) {
         this._onItemSelected(oEvent.getParameter('listItem'))
      }

      FormulaEditor.prototype._onItemSelected = function (item) {
         this.fireSuggestionSelected({ item })
         this._hidePopup()
      }

      FormulaEditor.prototype._getTextArea = function () {
         return $('#' + this._getInnerId())[0]
      }

      FormulaEditor.prototype._getInnerId = function () {
         return this.getId() + '--inner'
      }
      return FormulaEditor
   })

