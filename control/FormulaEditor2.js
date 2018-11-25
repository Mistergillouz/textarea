sap.ui.define([
   'sap/ui/core/Control',
   'sap/ui/core/Popup'
],
   function (Control, Popup) {
      "use strict";

      const FormulaEditor = Control.extend('control.FormulaEditor2', {
         metadata: {
            properties: {
               value: { type: 'string', defaultValue: '' },
               caretPosition: { type: 'int', defaultValue: 0 },
               functions: { type: 'array', defaultValue: [] },
               keywords: { type: 'array', defaultValue: [] },
               suggestions: { type: 'array', defaultValue: null },
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

         this._list = new sap.m.List({
            mode: 'SingleSelectMaster'
         })

         this._list.addStyleClass('sapUiSizeCompact')
         this._list.attachSelectionChange(this._onSelectionChanged.bind(this))
         const model = new sap.ui.model.json.JSONModel()
         this._list.setModel(model).bindItems('/', new sap.m.StandardListItem({
            icon: '{icon}',
            title: '{name}',
            type: 'Active'
         }))

         this._container = new sap.m.ScrollContainer({
            vertical: true,
            content: this._list
         })

         this._container.addStyleClass('sapWingFormulaTextAreaPopup')

         this._lineHeight = 0
         this._regexps = {}
         this._masterRegExp = null

         this._buildRules()
      }

      FormulaEditor.prototype.onAfterRendering = function () {
         Control.prototype.onAfterRendering.call(this);

         if (!this._lineHeight) {
            this._lineHeight = this._calculateLineHeight()
         }
         
         const styles = window.getComputedStyle(this.getDomRef())
         const padding = 1 + parseInt(styles.paddingTop) + parseInt(styles.paddingBottom) + Math.round(parseFloat(styles.borderTopWidth))  + Math.round(parseFloat(styles.borderBottomWidth))
         const growingMaxLines = this.getGrowingMaxLines()
         if (!isNaN(growingMaxLines)) {
            this.getDomRef().style.maxHeight = `${padding + (this._lineHeight * growingMaxLines)}px`
         }

         const rows = this.getRows()
         if (!isNaN(rows)) {
            this.getDomRef().style.minHeight = `${padding + (this._lineHeight * rows)}px`
         }

         
         const textarea = this._getTextArea()
         textarea.addEventListener('input', this._onUpdate.bind(this), false)
         textarea.addEventListener('keydown', this._onKeyDown.bind(this), false)
         textarea.addEventListener('mouseup', this._updatePositions.bind(this), false)
         
         textarea.value = this.getValue()
         
         // this.attachBrowserEvent('focusout', (oEvent) => {
            //    if (this._isPopupOpen() && !$.contains(this._container.getDomRef(), oEvent.relatedTarget)) {
               //       this._hidePopup()
               //    }
               // })
               
         this._updateFormula()
         this._updatePositions()
      }
     
      FormulaEditor.prototype.setValue = function (value) {
         this.setProperty('value', value, true)
         const textarea = this._getTextArea()
         if (textarea) {
            textarea.value = value
            this._updateFormula()
         }
      }

      FormulaEditor.prototype.setCaretPosition = function (value) {
         this.setProperty('caretPosition', value, true)
         this._setCaretPosition(value)
      }

      FormulaEditor.prototype.setScrollPosition = function (position) {
         this.setProperty('scrollPosition', position, true)
      }
      
      FormulaEditor.prototype.setFunctions = function (functions) {
         this.setProperty('functions', functions, true)
         this._buildRules()
      }

      FormulaEditor.prototype.setKeywords = function (keywords) {
         this.setProperty('keywords', keywords, true)
         this._buildRules()
      }

      FormulaEditor.prototype._buildRules = function () {
         const functionList = this.getFunctions().map((f) => f.name.toLowerCase())
         const keywordsList = this.getKeywords().map((f) => f.name.toLowerCase())

         const rulesSet = {
            // define: new RegExp(/[$A-Z_a-z0-9]/),
            object: new RegExp(/\[([^[\]]+)\]/),
            functions: functionList.length ? new RegExp(`(${functionList.join('|')})(?!\w|=)`) : null,
            keywords: keywordsList.length ? new RegExp(`(${keywordsList.join('|')}(?!\w|=))`) : null,
            // string: new RegExp(/"(\\.|[^"\r\n])*"?|'(\\.|[^'\r\n])*'?/),
            op: new RegExp(/[\+\-\*\/=<>!]=?|[\(\)\{\}\[\]\.\|]/),
            string: new RegExp(/"(\\.|[^"\r\n])*"?|'(\\.|[^'\r\n])*'?/),
            number: new RegExp(/0x[\dA-Fa-f]+|-?(\d+\.?\d*|\.\d+)/),
            other: new RegExp(/\S+/),
            space: new RegExp(/\s+/)
         }

         const rules = []
         this._regexps = []
         for (let rule in rulesSet) {
            if (rulesSet[rule]) {
               rules.push(rulesSet[rule].source)
               this._regexps.push({
                  name: rule,
                  regexp: new RegExp(`^(${rulesSet[rule].source})$`, 'i')
               })
            }
         }

         this._masterRegExp = new RegExp(rules.join('|'), 'gi')
      }

      FormulaEditor.prototype._identify = function (string) {
         const found = this._regexps.find((rule) => rule.regexp.test(string))
         return found ? found.name : null
      }
      
      FormulaEditor.prototype._colorize = function (text) {
         const output = this._getOutput()
         const oldTokens = output.childNodes
         const newTokens = text.match(this._masterRegExp)
         let firstDiff, lastDiffNew, lastDiffOld

         // find the first difference
         for (firstDiff = 0; firstDiff < newTokens.length && firstDiff < oldTokens.length; firstDiff++) {
            if (newTokens[firstDiff] !== oldTokens[firstDiff].textContent) {
               break
            }
         }

         // trim the length of output nodes to the size of the input
         while (newTokens.length < oldTokens.length) {
            output.removeChild(oldTokens[firstDiff])
         }

         // find the last difference
         for (lastDiffNew = newTokens.length - 1, lastDiffOld = oldTokens.length-1; firstDiff < lastDiffOld; lastDiffNew--, lastDiffOld--) {
            if (newTokens[lastDiffNew] !== oldTokens[lastDiffOld].textContent) {
               break
            }
         }

         // update modified spans
         for (; firstDiff <= lastDiffOld; firstDiff++) {
            oldTokens[firstDiff].className = this._identify(newTokens[firstDiff])
            oldTokens[firstDiff].textContent = oldTokens[firstDiff].innerText = newTokens[firstDiff]
         }

         // add in modified spans
         for (let insertionPt = oldTokens[firstDiff] || null; firstDiff <= lastDiffNew; firstDiff++) {
            const span = document.createElement("span")
            span.className = this._identify(newTokens[firstDiff])
            span.textContent = span.innerText = newTokens[firstDiff]
            output.insertBefore(span, insertionPt)
         }
      }

      // \[\b([a-zA-Z0-9\u00C0-\u00FF_ ])+\b\]/ -> dict object
      FormulaEditor.prototype._render = function (oRm) {
         oRm.write('<div')

         oRm.addStyle('width', this.getWidth())
         oRm.addStyle('height', this.getHeight())
         oRm.writeStyles()

         oRm.addClass('wingfe sapMInputBaseHeightMargin')
         oRm.writeClasses(this)

         oRm.writeControlData(this)
         oRm.write(">")

         oRm.write(`<pre id="${this.getId()}--output">`)
         oRm.write('</pre>')
         oRm.write(`<label id="${this.getId()}--label">`)
         oRm.write(`<textarea rows="1" id="${this.getId()}--textarea" class="wingfe-te" spellcheck="false" wrap="false"/>`)
         oRm.write('</label>')
         oRm.write("</div>")
      }

      
      FormulaEditor.prototype._onUpdate = function (oEvent) {
         this._updateFormula()
         this._afterUpdate(true, true)
      }

      FormulaEditor.prototype._updateFormula = function () {
         const output = this._getOutput()
         const textarea = this._getTextArea()
         var input = textarea.value
         if (input) {
            this._colorize(input)
         } else {
            output.innerHTML = ''
         }

         const label = this._getLabel()
         const heigth = output.offsetHeight + this._lineHeight
         label.style.height = heigth + 'px'
         label.style.width = output.offsetWidth + 'px'
         label.style.top = output.offsetTop + 'px'
         label.style.left = output.offsetLeft + 'px'
      }

      FormulaEditor.prototype._updatePositions = function () {
         this.setProperty('caretPosition', this._getCaretPosition(), true)
         this.setProperty('scrollPosition', this._getScrollPosition(), true)
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
         console.log("key=", oEvent.key)
         
         let preventDefault = false
         let updateCaret = false

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
                  }

                  if (index >= 0 && index < items.length) {
                     this._list.setSelectedItem(items[index])
                  }
                  
                  preventDefault = true
                  break

               case 'Escape':
                  this._hidePopup()
                  preventDefault = true
                  break

               case 'Enter':
                  item = this._list.getSelectedItem()
                  if (item) {
                     this._onItemSelected(item)
                  }
                  preventDefault = true
                  break

               default:
                  break
            }

         } else if (oEvent.ctrlKey || oEvent.altKey) {
            if (oEvent.ctrlKey && oEvent.keyCode === 32) {
               this.fireSuggestionsRequested()   
               preventDefault = true
            }
         } else if (oEvent.key === 'Enter') {
            if (!this.getAllowEnter()) {
               preventDefault = true
            }
         } else {
            updateCaret = ['ArrowDown', 'ArrowUp', 'ArrowLeft', 'ArrowRight'].indexOf(oEvent.key) !== -1
         }

         this._afterUpdate(false, updateCaret)
         if (preventDefault) {
            oEvent.preventDefault()
         }
      }

      FormulaEditor.prototype._afterUpdate = function (valueChanged, updateCaret) {
         if (!valueChanged && !updateCaret) {
            return
         }

         setTimeout(() => {
            if (updateCaret) {
               console.log('updateCaret')
               this._updatePositions()
            }
            
            if (valueChanged) {
               console.log('fireLiveChange')
               const value = this._getTextArea().value
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
            const rect = this.getDomRef().getBoundingClientRect()
            const domPopup = this._popup._$()
            domPopup.css('top', Math.floor(rect.y + rect.height)).css('left', Math.floor(rect.x))
         }
      }

      FormulaEditor.prototype._createPopup = function () {
         this._popup = new Popup(this._container, false, true, false)
      }

      FormulaEditor.prototype._hidePopup = function () {
         if (this._isPopupOpen()) {
            this._popup.close()
         }
      }

      FormulaEditor.prototype._isPopupOpen = function () {
         return this._popup && this._popup.isOpen()
      }

      FormulaEditor.prototype._setCaretPosition = function (pos) {
         const textarea = this._getTextArea()
         textarea.selectionStart = pos
         textarea.selectionEnd = pos
      }

      FormulaEditor.prototype._getCaretPosition = function () {
         return this._getTextArea().selectionStart
      }

      FormulaEditor.prototype._onSelectionChanged = function (oEvent) {
         this._onItemSelected(oEvent.getParameter('listItem'))
      }

      FormulaEditor.prototype._onItemSelected = function (item) {
         this.fireSuggestionSelected({ item })
         this._hidePopup()
      }

      FormulaEditor.prototype._getTextArea = function () {
         return $(`#${this.getId()}--textarea`)[0]
      }

      FormulaEditor.prototype._getOutput = function () {
         return $(`#${this.getId()}--output`)[0]
      }

      FormulaEditor.prototype._getLabel = function () {
         return $(`#${this.getId()}--label`)[0]
      }

      FormulaEditor.prototype._calculateLineHeight = function () {
         const output = this._getOutput()
         const span = document.createElement('span')
         span.innerHTML = '<br>'
         output.appendChild(span)
         const height = span.offsetHeight 
         output.removeChild(span)
         return height
      }

      return FormulaEditor
   })

