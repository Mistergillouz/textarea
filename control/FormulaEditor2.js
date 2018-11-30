sap.ui.define([
   'sap/ui/core/Control',
   'sap/ui/core/Popup'
],
   function (Control, Popup) {
      "use strict";

      const INVISIBLE_CHAR = '\u200c'

      const FormulaEditor = Control.extend('control.FormulaEditor2', {
         metadata: {
            properties: {
               width: { type: 'sap.ui.core.CSSSize', defaultValue: '100%' },
               height: { type: 'sap.ui.core.CSSSize', defaultValue: 'auto' },
               formula: { type: 'string', defaultValue: '' },
               caretPosition: { type: 'int', defaultValue: 0 },
               functions: { type: 'array', defaultValue: [] },
               keywords: { type: 'array', defaultValue: [] },
               suggestions: { type: 'array', defaultValue: null },
               rows: { type: 'int', defaultValue: 2 },
               growingMaxLines: { type: 'int', defaultValue: 0 },
               allowEnter: { type: 'boolean', defaultValue: true },
               scrollPosition: { type: 'object', defaultValue: null }
            },
            aggregations: {},
            events: {
               suggestionSelected: {},
               suggestionsRequested: {},
               formulaChange: {}
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

         this._updateFormula(this.getFormula())
         this._savePositions()

         const output = this._getOutput()
         output.addEventListener('input', this._onUpdate.bind(this), false)
         output.addEventListener('keydown', this._onKeyDown.bind(this), false)
         output.addEventListener('mouseup', this._onMouseUp.bind(this), false)
                  
         this.attachBrowserEvent('focusout', (oEvent) => {
            if (this.contains(oEvent.relatedTarget)) {
               this._hidePopup()
            }
         })
      }
     
      FormulaEditor.prototype.contains = function (target) {
         return this._isPopupOpen() && !$.contains(this._container.getDomRef(), target)
      }

      FormulaEditor.prototype.getFormula = function () {
         const formula = this.getProperty('formula')
         return formula.replace(/\u200c/g, '')
      }

      FormulaEditor.prototype.setFormula = function (formula) {
         this.setProperty('formula', formula, true)
         const output = this._getOutput()
         if (output) {
            this._updateFormula(formula)
         }
      }

      FormulaEditor.prototype.setCaretPosition = function (position) {
         this.setProperty('caretPosition', position, true)
         this._setCaretPosition(this._getOutput(), position)
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

         this._rulesSet = [
            {
               name: 'invis', 
               reg: new RegExp(/\u200c/, 'g') 
            },
            {
               name: 'object', 
               reg: new RegExp(/\[([^[\]]+)\]/, 'gi') 
            }, {
               name: 'functions',
               reg: functionList.length ? new RegExp(`(${functionList.join('|')})(?!\w|=)`, 'gi') : null
            }, {
               name: 'keywords',
               reg: keywordsList.length ? new RegExp(`(${keywordsList.join('|')}(?!\w|=))`, 'gi') : null
            }, {
               name: 'op',
               reg: new RegExp(/[\+\-\*\/=<>;!]=?|[\(\)\{\}\[\]\.\|]/, 'gi')
            }, {
               name: 'string',
               reg: new RegExp(/"(\\.|[^"\r\n])*"?|'(\\.|[^'\r\n])*'?/, 'gi')
            }, {
               name: 'number',
               reg: new RegExp(/0x[\dA-Fa-f]+|-?(\d+\.?\d*|\.\d+)/, 'gi')
            }, {
               name: 'other',
               reg: new RegExp(/\S+/, 'gi')
            }, {
               name: 'space',
               reg: new RegExp(/\s+/, 'gi')
            }
         ]
      }

      FormulaEditor.prototype._tokenize = function (inpuText) {

         const tokens = []
         let text = String(inpuText)
         let matchRule = null
         while (text.length) {
            const found = this._rulesSet.some((regexp) => {
               let result = false
               const matches = text.match(regexp.reg)
               if (matches) {
                  const matchText = matches.find((match) => text.indexOf(match) === 0)
                  if (matchText) {
                     result = true
                     matchRule = {
                        text: matchText,
                        rule: regexp.name
                     }
                  }
               }
               return result
            })
   
            if (found) {
               tokens.push(matchRule)
               text = text.substring(matchRule.text.length)
            } else {
               tokens.push({
                  text,
                  rule: 'other'
               })

               break
            }
         }

         return tokens
      }

      FormulaEditor.prototype._colorize = function (output, text) {
         const oldTokens = output.childNodes
         const newTokens = this._tokenize(text)
         let firstDiff, lastDiffNew, lastDiffOld

         const fnCompare = (element, token) => {
            if (token.text !== element.textContent) {
               return false
            }
            return element.classList && element.classList.contains(token.rule)
         }
         // find the first difference
         for (firstDiff = 0; firstDiff < newTokens.length && firstDiff < oldTokens.length; firstDiff++) {
            if (!fnCompare(oldTokens[firstDiff], newTokens[firstDiff])) {
               break
            }
         }

         // trim the length of output nodes to the size of the input
         while (newTokens.length < oldTokens.length) {
            output.removeChild(oldTokens[firstDiff])
         }

         // find the last difference
         for (lastDiffNew = newTokens.length - 1, lastDiffOld = oldTokens.length-1; firstDiff < lastDiffOld; lastDiffNew--, lastDiffOld--) {
            if (!fnCompare(oldTokens[lastDiffOld], newTokens[lastDiffNew])) {
               break
            }
         }

         // update modified spans
         for (; firstDiff <= lastDiffOld; firstDiff++) {
            oldTokens[firstDiff].className = newTokens[firstDiff].rule
            oldTokens[firstDiff].textContent = oldTokens[firstDiff].innerText = newTokens[firstDiff].text
         }

         // add in modified spans
         for (let insertionPt = oldTokens[firstDiff] || null; firstDiff <= lastDiffNew; firstDiff++) {
            const span = document.createElement('span')
            span.className = newTokens[firstDiff].rule
            span.textContent = span.innerText = newTokens[firstDiff].text
            output.insertBefore(span, insertionPt)
         }
      }

      // \[\b([a-zA-Z0-9\u00C0-\u00FF_ ])+\b\]/ -> dict object
      FormulaEditor.prototype._render = function (oRm) {
         oRm.write('<div contenteditable="true" spellcheck="false"')

         oRm.addStyle('width', this.getWidth())
         oRm.addStyle('height', this.getHeight())
         oRm.writeStyles()

         oRm.addClass('wingfe sapMInputBaseHeightMargin')
         oRm.writeClasses(this)

         oRm.writeControlData(this)
         oRm.write("/>")
      }

      
      FormulaEditor.prototype._onUpdate = function (oEvent) {
         setTimeout(() => {
            this._savePositions()
            console.log(this.getCaretPosition())
            this.setFormula(this._getOutput().innerText)
            this._setCaretPosition(this._getOutput(), this.getCaretPosition())
            // this._afterUpdate(true, true)

         }, 0)
      }

      FormulaEditor.prototype._updateFormula = function (formula) {
         const output = this._getOutput()
         if (!formula) {
            output.innerHTML = ''
            return
         }
         
         const nodes = output.childNodes
         const parts = formula.replace(new RegExp(INVISIBLE_CHAR, 'g'), '').split('\n')
         parts.forEach((part, index) => {
            let div = nodes[index]
            if (!div) {
               div = document.createElement('div')
               // div.style.height = this._lineHeight + 'px'
               output.appendChild(div)
               this._colorize(div, part)
            } 
            if (part.length) {
               if (div.nodeName !== 'DIV') {
                  const newDiv = document.createElement('div')
                  for (let i = 0; i < div.childNodes.length; i++) {
                     newDiv.appendChild(div.childNodes[i])
                  }
                  output.insertBefore(newDiv, div)
                  output.removeChild(div)
               }
               // this._fixNodes(newDiv)
               this._colorize(div, part)
            } 
         })

         for (let i = parts.length; i < nodes.length; i++) {
            output.removeChild(nodes[i])
         }         
      }

      FormulaEditor.prototype._fixNodes = function (element) {
         const divNodes = element.childNodes
         for (let i = 0; i < divNodes.length; i++) {
            const divNode = divNodes[i]
            if (divNode.nodeName !== 'SPAN') {
               const span = document.createElement('span')
               span.textContent = divNode.textContent
               element.insertBefore(span, divNode)
               element.removeChild(divNode)
            }
         }
      }

      FormulaEditor.prototype._savePositions = function () {
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
         // const textarea = this._getTextArea()
         // return {
         //    left: textarea.scrollLeft,
         //    top: textarea.scrollTop
         // }
      }

      FormulaEditor.prototype._setScrollPosition = function (scroll) {
         if (scroll) {
            const textarea = this._getTextArea()
            textarea.scrollLeft = scroll.left
            textarea.scrollTop = scroll.top
         }
      }
      
      FormulaEditor.prototype._onMouseUp = function (oEvent) {
         this._savePositions()
         this._hidePopup()
         console.log('mouseUp', this.getCaretPosition())
      }

      FormulaEditor.prototype._onKeyDown = function (oEvent) {
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

               case 'ArrowLeft':
               case 'ArrowRight':
                  this._hidePopup()
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
            // if (this.getAllowEnter()) {
            //    setTimeout(() => {
            //       this._fixLineBreak()
            //       this._onUpdate()
            //    }, 0)
            // }
            // preventDefault = true
         } else if (['ArrowDown', 'ArrowUp', 'ArrowLeft', 'ArrowRight'].indexOf(oEvent.key) !== -1) {
            updateCaret = true
            this._hidePopup()
         }

         this._afterUpdate(false, updateCaret)
         if (preventDefault) {
            oEvent.preventDefault()
         }
      }

      FormulaEditor.prototype._fixLineBreak = function () {
         var sel, range;
         if (window.getSelection) {
             // IE9 and non-IE
             sel = window.getSelection();
             if (sel.getRangeAt && sel.rangeCount) {
                 range = sel.getRangeAt(0);
                 range.deleteContents();
     
                 // Range.createContextualFragment() would be useful here but is
                 // only relatively recently standardized and is not supported in
                 // some browsers (IE9, for one)
                 var el = document.createElement("div");
                 el.innerHTML = '<br>\u200c';
                 var frag = document.createDocumentFragment(), node, lastNode;
                 while ( (node = el.firstChild) ) {
                     lastNode = frag.appendChild(node);
                 }
                 var firstNode = frag.firstChild;
                 range.insertNode(frag);
                 
                 // Preserve the selection
                 if (lastNode) {
                     range = range.cloneRange();
                     range.setStartAfter(lastNode);
                     range.collapse(true);
                     sel.removeAllRanges();
                     sel.addRange(range);
                 }
             }
         } else if ( (sel = document.selection) && sel.type != "Control") {
             // IE < 9
             var originalRange = sel.createRange();
             originalRange.collapse(true);
             sel.createRange().pasteHTML('<br>');
         }
     }

      FormulaEditor.prototype._afterUpdate = function (formulaChanged, updateCaret) {
         if (!formulaChanged && !updateCaret) {
            return
         }

         setTimeout(() => {
            if (updateCaret) {
               this._savePositions()
            }
            
            if (formulaChanged) {
               const formula = this._getTextArea().value
               this.setProperty('formula', formula, true)
               this.fireFormulaChange({ formula })
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
      
      FormulaEditor.prototype._setCaretPosition = function (element, caretPos) {
         console.log('_setCaretPosition', caretPos)
         const nodes = element.childNodes
         let offset = caretPos, row = null
         for (let i = 0; i < nodes.length; i++) {
            const rowLength = nodes[i].innerText.length
            if (offset <= rowLength) {
               row = nodes[i]
               break
            }
            offset -= rowLength + 1
         }
         
         if (row) {
            const textNodes = []
            this._getTextNodes(row, textNodes)
            for (let i = 0; i < textNodes.length; i++) {
               const nodeLength = textNodes[i].textContent.length
               if (offset <= nodeLength) {
                  const range = document.createRange()
                  range.setStart(textNodes[i], offset)
                  range.setEnd(textNodes[i], offset)
                  const selection = window.getSelection()
                  selection.removeAllRanges()
                  selection.addRange(range)
                  return
               }

               offset -= nodeLength
            }
         }
      }

      FormulaEditor.prototype._getTextNodes = function (node, textNodes) {
         if (node.nodeType === 3) {
            textNodes.push(node)
         } else {
            for (let i = 0; i < node.childNodes.length; i++) {
               this._getTextNodes(node.childNodes[i], textNodes)
            }
         }
      }

      FormulaEditor.prototype._getCaretPosition = function () {         
         const element = this._getOutput()
         const sel = window.getSelection()
         const rowNodes = element.childNodes
         let offset = 0, row = null
         for (let i = 0; i < rowNodes.length; i++) {
            if (rowNodes[i].contains(sel.focusNode)) {
               row = rowNodes[i]
               break
            }
            offset += rowNodes[i].innerText.length + 1
         }

         if (row) {
            const textNodes = []
            this._getTextNodes(row, textNodes)
            for (let i = 0; i < textNodes.length; i++) {
               if (textNodes[i] === sel.focusNode) {
                  break
               }
               offset += textNodes[i].textContent.length
            }
            offset += sel.focusOffset
         }
         return row ? offset : 0
      }

      FormulaEditor.prototype._onSelectionChanged = function (oEvent) {
         this._onItemSelected(oEvent.getParameter('listItem'))
      }

      FormulaEditor.prototype._onItemSelected = function (item) {
         this.fireSuggestionSelected({ item })
         this._hidePopup()
      }

     FormulaEditor.prototype._getOutput = function () {
         return this.getDomRef()
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

