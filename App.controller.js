sap.ui.define([
   "sap/ui/core/mvc/Controller"
], function (Controller) {
   "use strict";

   const C = Controller.extend('gs.App', {})

   let count = 0

   C.prototype.onInit = function () {

      const formulaEditor = this.byId('formula-editor')
      const text = 'aah() Hello World!!!'
      const highlights = this._getHighlights(text)
      formulaEditor.setValue(text)
      formulaEditor.setHighlights(highlights)
   }

   C.prototype.onLiveChange = function (oEvent) {
      const value = oEvent.getParameter('value')
      this._handleSuggestions(oEvent, value)
      const highlights = this._getHighlights(value)
      this.byId('formula-editor').setHighlights(highlights)
   }

   C.prototype.onSuggestionsRequested = function (oEvent) {
      this._handleSuggestions(oEvent, oEvent.getSource().getValue())
   }

   C.prototype.onSuggestionSelected = function (oEvent) {
      const suggestion = oEvent.getParameter('item').getBindingContext().getObject()
      const position = oEvent.getSource().getCaretPosition()
      const formula = oEvent.getSource().getValue()
      const wordInfos = this._extractWordAt(formula, position - 1)
      if (wordInfos) {
         console.log(wordInfos)
         let text = suggestion.text
         if (wordInfos.isFunction) {
            const index = suggestion.text.indexOf('(')
            if (index !== -1) {
               text = text.substring(0, index)
            }
         }
         let newFormula = formula.substring(0, wordInfos.start) + text + formula.substring(wordInfos.end + 1)
         const highlights = this._getHighlights(newFormula)

         oEvent.getSource().setValue(newFormula)
         oEvent.getSource().setHighlights(highlights)
         oEvent.getSource().setCaretPosition(wordInfos.start + text.length - 1)
      }
   }

   C.prototype._handleSuggestions = function (oEvent, formula) {
      const position = oEvent.getSource().getCaretPosition()
      const wordInfos = this._extractWordAt(formula, position - 1)
      console.log(formula, 'caret=', position, 'infos', wordInfos)
      let suggestions = []
      if (wordInfos) {
         suggestions = this._getSuggestions(wordInfos.partialWord)
         console.log(suggestions.length)
      }

      oEvent.getSource().setSuggestions(suggestions)
   }

   C.prototype._extractWordAt = function (text, position) {
      const regLetters = new RegExp(/[A-Za-z\u00C0-\u00FF_]+/)
      const regFunctDelimiters = new RegExp(/[()]/)
      const regObjectDelimiters = new RegExp(/[\[\]]/)

      let start = -1, isObject = false
      for (let i = position; i >= 0; i--) {
         const char = text.charAt(i)
         if (!regLetters.test(char)) {
            isObject = regObjectDelimiters.test(char)
            break
         }
         start = i
      }

      if (start !== -1) {
         let end = start
         let isFunction = false
         for (let i = start + 1; i < text.length; i++) {
            const char = text.charAt(i)
            if (!regLetters.test(char)) {
               isFunction = regFunctDelimiters.test(char)
               break
            }

            end = i
         }
         return {
            position,
            fullWord: text.substring(start, end + 1),
            partialWord: text.substring(start, position),
            start,
            end,
            isFunction,
            isObject
         }
      }
      
      return null
   }
   
   C.prototype._getHighlights = function (value) {
      const dico = this._getDictionary()
      const highlights = []
      let index = 0
      while (index < value.length) {
         const infos = this._extractWordAt(value, index)
         if (infos) {
            const found = dico.find((word) => word.toLocaleLowerCase() === infos.fullWord.toLocaleLowerCase())
            if (found) {
               const word = found.replace(/[()\[\]]/g, '')
               highlights.push({
                  start: index,
                  len: word.length,
                  tooltip: 'coucou',
                  css: 'wingMkBlue'
               })
               index += found.length + 1
            } else {
               index++
            }
         } else {
            index++
         }
      }

      return highlights
   }

   C.prototype._getSuggestions = function (text) {
      const dico = this._getDictionary()
      return dico
         .filter(w => w.toLocaleLowerCase().indexOf(text.toLocaleLowerCase()) === 0)
         .map(w => ({ text: w + '()', icon: 'sap-icon://source-code'}))
      
   }

   C.prototype._getDictionary = function () {
      return ['aah', 'aahed', 'aahing', 'aahs', 'aal', 'aalii', 'aaliis', 'aals', 'aam', 'aani', 'aardvark', 'aardvarks', 'aardwolf', 'aardwolves', 'aargh', 'aaron', 'aaronic', 'aaronical', 'aaronite', 'aaronitic', 'aarrgh', 'aarrghh', 'aaru', 'aas', 'aasvogel', 
      'aasvogels', 'ab', 'aba', 'ababdeh', 'ababua', 'abac', 'abaca', 'abacay', 'abacas', 'abacate', 'abacaxi', 'abaci', 'abacinate', 'abacination', 'abacisci', 'abaciscus', 'abacist', 'aback', 'abacli', 'abacot', 
      'abacterial', 'abactinal', 'abactinally', 'abaction', 'abactor', 'abaculi',
      '[City]', '[Region]'
   ]

   }

   return C
});