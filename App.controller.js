sap.ui.define([
  "sap/ui/core/mvc/Controller"
], function (Controller) {
  "use strict";

  const C = Controller.extend('gs.App', {})

  let count = 0

  const SuggestionKind = {
    Formula: 1,
    Object: 2
  }

  C.prototype.onInit = function () {
    this.byId('formula-editor2').setFunctions(this._getFunctions())
  }

  C.prototype.onLiveChange = function (oEvent) {
    const value = oEvent.getParameter('value')
    this._handleSuggestions(oEvent, value)
  }

  C.prototype.onSuggestionsRequested = function (oEvent) {
    this._handleSuggestions(oEvent, oEvent.getSource().getValue())
  }

  C.prototype.onSuggestionSelected = function (oEvent) {
    const suggestion = oEvent.getParameter('item').getBindingContext().getObject()
    const caret = oEvent.getSource().getCaretPosition() - 1
    const formula = oEvent.getSource().getValue()
    const wordInfos = this._extractWordAt(formula, caret)
    if (wordInfos) {
      const [newFormula, leftBracketAdded] = this._insertSuggestion(formula, suggestion, wordInfos) // eslint-disable-line
      oEvent.getSource().setValue(newFormula)

      let newCaretPosition = wordInfos.start + suggestion.name.length + 1
      if (leftBracketAdded) {
        newCaretPosition += 1
      }
      oEvent.getSource().setCaretPosition(newCaretPosition)
    }
  }

  C.prototype._handleSuggestions = function (oEvent, formula) {
    const position = oEvent.getSource().getCaretPosition()
    const wordInfos = this._extractWordAt(formula, position - 1)
    let suggestions = []
    if (wordInfos) {
      suggestions = this._getSuggestions(wordInfos)
    }

    oEvent.getSource().setSuggestions(suggestions)
  }

  C.prototype._extractWordAt = function (text, position) {
    if (!text || text.trim().charAt(0) != '=' || position < 1) {
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

  C.prototype._insertSuggestion = function (formula, suggestion, textInfos) {
    let leftBracketAdded = false
    let text = formula.substring(0, textInfos.start)
    if (suggestion.kind === SuggestionKind.Object) {
      if (text.charAt(text.length - 1) !== '[') {
        leftBracketAdded = true
        text += '['
      }
    }

    text += suggestion.name
    let remaining = formula.substring(textInfos.end + 1)
    if (suggestion.kind === SuggestionKind.Formula) {
      if (remaining.charAt(0) !== '(' && suggestion.syntax.indexOf('(') !== -1) {
        remaining = `()${remaining}`
      }
    } else if (remaining.charAt(0) !== ']') {
      remaining = `]${remaining}`
    }

    text += remaining
    return [
      text,
      leftBracketAdded
    ]
  }

  C.prototype._getSuggestions = function (textInfos) {
    const textPart = textInfos.partialWord.toLowerCase().trim()
    let suggestedfunctions = []
    if (!textInfos.withinObject) {
      const functions = this._getFunctions()
      suggestedfunctions = this._match(functions, textPart, (entry) => Object.assign(entry, {
        icon: 'sap-icon://simulate',
        kind: SuggestionKind.Formula
      }))
    }

    const dictObjects = this._getDictionary()
    const suggestedDictObjects = this._match(dictObjects, textPart, (entry) => {
      let icon = null
      switch (entry['@qualification']) {
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

      return Object.assign(entry, {
        kind: SuggestionKind.Object,
        icon
      })
    })

    return suggestedfunctions.concat(suggestedDictObjects)
  }

  C.prototype._match = function (suggestions, textPart, fnCallback) {
    return (suggestions || [])
      .filter((entry) => entry.name.toLowerCase().indexOf(textPart) === 0)
      .map((entry) => fnCallback(JSON.parse(JSON.stringify(entry))))
  }


  C.prototype._getDictionary = function () {
    return this.getView().getViewData().dict
  }
  C.prototype._getFunctions = function () {
    return this.getView().getViewData().functions
  }

  return C
});