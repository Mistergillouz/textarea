
/* eslint-disable object-property-newline, max-statements, no-loop-func, no-multi-assign */
sap.ui.define([
  'sap/ui/core/Control',
  'sap/ui/core/Popup'
],
  function (Control, Popup) { // eslint-disable-line
    "use strict";

    const SuggestionType = {
      Formula: 'formula',
      Object: 'object',
      Operators: 'operator'
    }

    const FormulaEditor = Control.extend('sap.bi.webi.ui.control.FormulaEditor', {
      metadata: {
        properties: {
          width: { type: 'sap.ui.core.CSSSize', defaultValue: '100%' },
          height: { type: 'sap.ui.core.CSSSize', defaultValue: 'auto' },
          formula: { type: 'string', defaultValue: '' },
          functions: { type: 'array', defaultValue: [] },
          operators: { type: 'array', defaultValue: [] },
          dictionary: { type: 'object', defaultValue: {} },
          rows: { type: 'int', defaultValue: 2 },
          growingMaxLines: { type: 'int', defaultValue: 0 },
          allowEnter: { type: 'boolean', defaultValue: true },
          // Private properties
          suggestions: { type: 'array', defaultValue: null },
          caretPosition: { type: 'int', defaultValue: 0 },
          scrollPosition: { type: 'object', defaultValue: null }
        },
        aggregations: {},
        events: {
          formulaChange: {}
        }
      },
      renderer: (oRm, self) => self._render(oRm)
    })

    FormulaEditor.prototype.init = function () {

      // Const browser = sap.ui.Device.browser
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
      this._msie = sap.ui.Device.browser.internet_explorer

      this._buildRules()
    }

    FormulaEditor.prototype.onAfterRendering = function () {
      if (!this._lineHeight) {
        this._lineHeight = this._calculateLineHeight()
      }

      const styles = window.getComputedStyle(this.getDomRef())
      const padding = 1 + parseInt(styles.paddingTop, 10) + parseInt(styles.paddingBottom, 10) + Math.round(parseFloat(styles.borderTopWidth)) + Math.round(parseFloat(styles.borderBottomWidth))
      const growingMaxLines = this.getGrowingMaxLines()
      if (growingMaxLines > 0) {
        this.getDomRef().style.maxHeight = `${padding + (this._lineHeight * growingMaxLines)}px`
      }

      const rows = this.getRows()
      if (rows > 0) {
        this.getDomRef().style.minHeight = `${padding + (this._lineHeight * rows)}px`
      }

      this._updateFormula(this.getFormula())
      this._savePositions()

      const output = this._getOutput()
      output.addEventListener(this._msie ? 'keyup' : 'input', this._onUpdate.bind(this), false)
      output.addEventListener('keydown', this._onKeyDown.bind(this), false)
      output.addEventListener('mouseup', this._onMouseUp.bind(this), false)

      this.attachBrowserEvent('focusout', (oEvent) => {
        if (!this.contains(oEvent.relatedTarget)) {
          this._hidePopup()
        }
      })
    }

    FormulaEditor.prototype.contains = function (target) {
      return this._isPopupOpen() && $.contains(this._container.getDomRef(), target)
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
      this._setCaretPosition(position)
    }

    FormulaEditor.prototype.setScrollPosition = function (position) {
      this.setProperty('scrollPosition', position, true)
    }

    FormulaEditor.prototype.setFunctions = function (functions) {
      this.setProperty('functions', functions, true)
      this._buildRules()
    }

    FormulaEditor.prototype.setOperators = function (value) {
      this.setProperty('operators', value, true)
      this._buildRules()
    }

    FormulaEditor.prototype._buildRules = function () {
      const functionList = this.getFunctions().map((f) => f.name)
      const operatorsList = this.getOperators().map((f) => this._escapeRegExpChars(f.name))
      const ifThenElseList = this._getAdditionalKeywords().map((f) => f.name)

      this._rulesSet = [
        {
          name: 'object',
          reg: new RegExp(/\[([^[\]]+)\]/gi)
        },
        {
          name: 'functions',
          reg: functionList.length ? new RegExp(`(${functionList.join('|')})(?!\w|=)`, 'gi') : null
        },
        {
          name: 'operators',
          reg: operatorsList.length ? new RegExp(`(${operatorsList.join('|')}(?!\w|=))`, 'gi') : null
        },
        {
          name: 'ifthenelse',
          reg: ifThenElseList.length ? new RegExp(`(${ifThenElseList.join('|')}(?!\w|=))`, 'gi') : null
        },
        {
          name: 'op',
          reg: new RegExp(/[\+\-\*\/=<>;!]=?|[\(\)\{\}\[\]\.\|]/gi)
        },
        {
          name: 'string',
          reg: new RegExp(/"(\\.|[^"\r\n])*"?|'(\\.|[^'\r\n])*'?/gi)
        },
        {
          name: 'number',
          reg: new RegExp(/0x[\dA-Fa-f]+|-?(\d+\.?\d*|\.\d+)/gi)
        },
        {
          name: 'other',
          reg: new RegExp(/\S+/gi)
        },
        {
          name: 'space',
          reg: new RegExp(/\s+/gi)
        }
      ]
    }

    FormulaEditor.prototype._tokenize = function (inputText) {

      const tokens = []
      let text = String(inputText)
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
      for (lastDiffNew = newTokens.length - 1, lastDiffOld = oldTokens.length - 1; firstDiff < lastDiffOld; lastDiffNew-- , lastDiffOld--) {
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

    FormulaEditor.prototype._render = function (oRm) {
      const msie = this._msie
      if (msie) {
        oRm.write('<div contenteditable="false">')  
      }

      oRm.write('<div contenteditable="true" spellcheck="false"')

      oRm.addStyle('width', this.getWidth())
      oRm.addStyle('height', this.getHeight())
      oRm.writeStyles()

      oRm.addClass('wingfe sapMInputBaseHeightMargin')
      oRm.writeClasses(this)

      oRm.writeControlData(this)
      oRm.write('/>')

      if (msie) {
        oRm.write('</div>')
      }
    }


    FormulaEditor.prototype._onUpdate = function () {
      setTimeout(() => {
        this._savePositions()
        this.setFormula(this._getFormula())
        debugger

        this._setCaretPosition(this.getCaretPosition())
        this._handleSuggestions()
      }, 0)
    }

    FormulaEditor.prototype._updateFormula = function (formula) {

      const output = this._getOutput()
      const nodes = output.childNodes
      const parts = formula.split('\n')

      parts.forEach((part, index) => {
        let rowElement = nodes[index]
        if (!rowElement) {
          rowElement = this._newRow()
          output.appendChild(rowElement)
        } else {
          this._fixNodes(rowElement)
          if (rowElement.nodeName !== 'DIV') {
            const newRowElement = this._newRow()
            newRowElement.appendChild(rowElement)
            rowElement = newRowElement
          }
        }
        this._colorize(rowElement, part)
      })
    }

    FormulaEditor.prototype._fixNodes = function (node) {
      for (let i = node.childNodes.length - 1; i >= 0; i--) {
        const childNode = node.childNodes[i]
        if (childNode.nodeName === 'SPAN') {
          const text = this._purgeText(childNode.innerHTML)
          if (text) {
            childNode.innerHTML = text
          } else {
            childNode.innerHTML = ''
            node.removeChild(childNode)
          }
        } else {
          const span = this._toSpan(childNode)
          if (span) {
            node.insertBefore(span, childNode)
          }
          node.removeChild(childNode)
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
      const textarea = this._getOutput()
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

    FormulaEditor.prototype._onMouseUp = function (oEvent) {
      this._savePositions()
      this._hidePopup()
    }

    FormulaEditor.prototype._onKeyDown = function (oEvent) {
      let preventDefault = false
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
          this._updatePositions()
          this._handleSuggestions()
          preventDefault = true
        }
      } else if (oEvent.key === 'Enter' && !this.getAllowEnter()) {
        preventDefault = true
      } else if (['ArrowDown', 'ArrowUp', 'ArrowLeft', 'ArrowRight'].indexOf(oEvent.key) !== -1) {
        this._hidePopup()
      }

      if (preventDefault) {
        oEvent.preventDefault()
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

    FormulaEditor.prototype._getFormula = function () {
      const parts = []
      const rows = this._getOutput().childNodes
      for (let i = 0; i < rows.length; i++) {
        const text = rows[i].innerText || rows[i].textContent
        parts.push(this._purgeText(text))
      }

      return parts.join('\n')
    }

    FormulaEditor.prototype._setCaretPosition = function (caretPos) {
      const nodes = this._getOutput().childNodes
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
        if (this._containsNode(rowNodes[i], sel.focusNode)) {
          row = rowNodes[i]
          break
        }
        offset += this._purgeText(rowNodes[i].innerText).length + 1
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

    FormulaEditor.prototype._containsNode = function (node, targetNode) {
      if (node === targetNode) {
        return true
      }

      const child = node.childNodes || []
      for (let i = 0; i < child.length; i++) {
        if (this._containsNode(child[i], targetNode)) {
          return true
        }
      }

      return false
    }

    FormulaEditor.prototype._onSelectionChanged = function (oEvent) {
      this._onItemSelected(oEvent.getParameter('listItem'))
    }

    FormulaEditor.prototype._onItemSelected = function (item) {
      const suggestion = item.getBindingContext().getObject()
      this._onSuggestionSelected(suggestion)
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

    FormulaEditor.prototype._updatePositions = function () {
      this.setCaretPosition(this._getCaretPosition())
      this.setScrollPosition(this._getScrollPosition())
    }

    FormulaEditor.prototype._newRow = function () {
      const div = document.createElement('div')
      if (!this._msie) {
        div.style.minHeight = this._lineHeight + 'px'
      }
      div.classList.add('winfe-row')
      return div
    }

    FormulaEditor.prototype._toSpan = function (textElement) {
      const text = this._purgeText(textElement.innerText)
      if (text) {
        const span = document.createElement('span')
        span.innerText = text
        return span
      }

      return null
    }

    FormulaEditor.prototype._purgeText = function (text) {
      return text.replace(/\r\n/g, '').replace(/\n/g, '').replace(/<br>/g, '')
    }

    FormulaEditor.prototype._onSuggestionSelected = function (suggestion) {
      const formula = this.getFormula()
      const caret = this.getCaretPosition() - 1
      const wordInfos = this._extractWordAt(formula, caret)
      if (wordInfos) {
        const [newFormula, leftBracketAdded] = this._insertSuggestion(formula, suggestion, wordInfos) // eslint-disable-line
        this.setFormula(newFormula)

        let newCaretPosition = wordInfos.start + suggestion.name.length + 1
        if (leftBracketAdded) {
          newCaretPosition += 1
        }
        this.setCaretPosition(newCaretPosition)
      }
    }

    FormulaEditor.prototype._handleSuggestions = function () {
      const formula = this.getFormula()
      const caret = this.getCaretPosition() - 1
      const textInfos = this._extractWordAt(formula, caret)
      let suggestions = []
      if (textInfos) {
        suggestions = this._buildSuggestions(textInfos)
      }

      this.setSuggestions(suggestions)
    }

    FormulaEditor.prototype._buildSuggestions = function (textInfos) {
      const suggestions = []
      const text = textInfos.partialWord.toLowerCase().trim()
      if (!textInfos.withinObject) {
        const functions = this.getFunctions()
        suggestions.push(...this._match(functions, text, (entry) => Object.assign(entry, {
          icon: 'sap-icon://simulate',
          type: SuggestionType.Formula
        })))

        const operators = this.getOperators()
        suggestions.push(...this._match(operators, text, (entry) => Object.assign(entry, {
          icon: 'sap-icon://attachment',
          type: SuggestionType.Operators
        })))
      }

      const dict = this.getDictionary()
      const expressions = dict.expression || []
      suggestions.push(...this._match(expressions, text,
        (expression) => this._applyExpressionSuggestion(expressions, expression)))

      const variables = (dict.variable || []).concat(dict.link || [])
      suggestions.push(...this._match(variables, text,
        (variable) => this._applyVariableSuggestion(variable)))

      return suggestions
    }

    FormulaEditor.prototype._match = function (suggestions, textPart, callback) {
      return suggestions
        .filter((entry) => entry.name.toLowerCase().indexOf(textPart) === 0)
        .map((entry) => callback(JSON.parse(JSON.stringify(entry))))
    }

    FormulaEditor.prototype._insertSuggestion = function (formula, suggestion, textInfos) {
      let leftBracketAdded = false
      let text = formula.substring(0, textInfos.start)
      let suggestionName = suggestion.name

      if (suggestion.type === SuggestionType.Object) {
        if (suggestionName.charAt(0) === '[') {
          suggestionName = suggestionName.substring(1)
        }
        if (suggestionName.charAt(suggestionName.length - 1) === ']') {
          suggestionName = suggestionName.substring(0, suggestionName.length - 1)
        }
        if (text.charAt(text.length - 1) !== '[') {
          leftBracketAdded = true
          text += '['
        }
      }

      text += suggestionName

      let remaining = formula.substring(textInfos.end + 1)
      if (suggestion.type === SuggestionType.Formula) {
        if (suggestion.syntax.indexOf('(') !== -1 && remaining.charAt(0) !== '(') {
          remaining = `()${remaining}`
        }
      } else if (suggestion.type === SuggestionType.Object && remaining.charAt(0) !== ']') {
        remaining = `]${remaining}`
      }

      text += remaining
      return [
        text,
        leftBracketAdded
      ]
    }

    FormulaEditor.prototype._extractWordAt = function (text, position) { // eslint-disable-line
      if (!text || position < 1) {
        return null
      }

      let quotes = 0
      let openBracket = false
      for (let i = 0; i <= position; i++) {
        const char = text.charAt(i)
        if (char === '"') {
          quotes += 1
        }
        if ((quotes % 2) === 0) {
          if (char === '[') {
            openBracket = true
          } else if (char === ']') {
            openBracket = false
          }
        }
      }

      // Inside a quoted string
      if (quotes % 2) {
        return null
      }

      let start = -1
      let end = -1
      if (openBracket) {
        // Rewing to the opening bracket
        for (let i = position; i >= 0; i--) {
          if (text.charAt(i) === '[') {
            break
          }
          start = i
        }

        end = start
        for (let i = position; i < text.length; i++) {
          const char = text.charAt(i)
          if (']();,'.indexOf(char) !== -1) {
            break
          }
          end = i
        }
      } else {
        const regLetters = new RegExp(/[A-Za-z0-9\u00C0-\u00FF_]+/)
        for (let i = position; i >= 0; i--) {
          const char = text.charAt(i)
          if (!regLetters.test(char)) {
            break
          }
          start = i
        }
        if (start !== -1) {
          end = position
          for (let i = start + 1; i < text.length; i++) {
            const char = text.charAt(i)
            if (!regLetters.test(char)) {
              break
            }
            end = i
          }
        }
      }

      if (start !== -1) {
        return {
          fullWord: text.substring(start, end + 1),
          partialWord: text.substring(start, position + 1),
          withinObject: openBracket,
          start,
          end
        }
      }

      return null
    }

    FormulaEditor.prototype._applyExpressionSuggestion = function (expressions, inputExpression) {
      const expression = this._applyVariableSuggestion(inputExpression)

      const same = expressions.filter((other) => expression.name === other.name)
      if (same.length > 1) {
        expression.name = expression.formulaLanguageId
      }

      return expression
    }

    FormulaEditor.prototype._applyVariableSuggestion = function (suggestion) {
      let icon = null
      switch (suggestion['@qualification']) {
        case 'Hierarchy':
          icon = 'sap-icon://product'
          break
        case 'Measure':
        case 'Attribute':
          icon = 'sap-icon://measure'
          break
        default:
          icon = 'sap-icon://dimension'
      }

      suggestion.icon = icon
      suggestion.type = SuggestionType.Object
      return suggestion
    }

    FormulaEditor.prototype._escapeRegExpChars = function (text) {
      return text.toLowerCase().trim().replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
    }

    FormulaEditor.prototype._getAdditionalKeywords = function () {
      return [
        {
          id: '_IF_',
          name: 'If',
          description: '',
          syntax: ''
        },
        {
          id: '_then_',
          name: 'Then',
          description: '',
          syntax: ''
        },
        {
          id: '_else_',
          name: 'Else',
          description: '',
          syntax: ''
        }
      ]
    }

    return FormulaEditor
  })

