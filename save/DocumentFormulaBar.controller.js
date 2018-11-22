/* eslint-disable max-lines-per-function, no-magic-numbers, max-statements, no-unused-vars, max-len, prefer-object-spread */

sap.ui.define([
  'sap/bi/webi/controller/BaseController',
  'sap/bi/smart/core/action/ActionDispatcher',
  'sap/bi/smart/core/action/ActionRegistry',
  'sap/bi/smart/core/store/StoreRegistry',
  'sap/bi/webi/core/flux/core/HelperRegistry',
  'sap/bi/webi/core/utils/ObjectUtils',
  'sap/bi/webi/jsapi/flux/utils/ContextUtils',
  'sap/bi/webi/ui/selection/Selection',
  'sap/m/MessageToast'
  ], function ( // eslint-disable-line
  BaseController,
  ActionDispatcher,
  ActionRegistry,
  StoreRegistry,
  HelperRegistry,
  ObjectUtils,
  ContextUtils,
  Selection,
  MessageToast
) {
  'use strict'

  const SuggestionKind = {
    Formula: 1,
    Object: 2
  }

  const Controller = BaseController.extend('sap.bi.webi.components.document.formulabar.controller.DocumentFormulaBar', {})

  Controller.prototype.onInit = function () {
    BaseController.prototype.onInit.call(this)
    this._model = new sap.ui.model.json.JSONModel({
      visible: true,
      editEnabled: false,
      createEnabled: false,
      cancelEnabled: false,
      acceptEnabled: false,
      inputEnabled: false,
      formulaText: null
    })

    this.getView().setModel(this._model)
    StoreRegistry.getFeedbackStore().registerSelectionInformation(this.handleSelectionChanged.bind(this), this)
  }

  Controller.prototype.onAfterRendering = function () {
    // Intercept enter key
    const textarea = this.byId('inputField')
    textarea.onsapenter = (oEvent) => {
      // GS: retrieving the formula text via this._model.getProperty('/formulaText')
      // Do not seems to return the right value within the onsapenter()
      const formula = this.byId('inputField').getValue()
      this._onAccept(formula)
      // Do not let the textarea receive the enter key
      oEvent.preventDefault()
    }
  }

  Controller.prototype.onCancel = function () {
    const text = this._model.getProperty('/prevFormulaText')
    this._model.setProperty('/formulaText', text)
  }

  Controller.prototype.onAccept = function () {
    this._onAccept(this._model.getProperty('/formulaText'))
  }

  Controller.prototype.onCreateVariable = function () {
    MessageToast.show('TODO: onCreateVariable!')
  }

  Controller.prototype.onEditFormula = function () {
    MessageToast.show('TODO: onEditFormula!')
  }

  /* STORE EVENTS */
  // --------------------------------------------------------

    Controller.prototype.handleSelectionChanged = function (oEvent) { // eslint-disable-line
    const selectionInformation = StoreRegistry.getFeedbackStore().getSelectionInformation()
    const { currentSelection } = selectionInformation

    let reportElement = null
    let bid = 0
    const type = currentSelection.getType()
    switch (type) {
      case Selection.Type.FreeCell:
      case Selection.Type.TableCell:
      case Selection.Type.TableCellFeed:
      case Selection.Type.FreeCellFeed: {
        bid = currentSelection.getRoElement().getBid()
        const elementArgs = ContextUtils.assign(HelperRegistry.getAppStoreHelper().getCurrentReportContext(), { elementId: bid })
        reportElement = StoreRegistry.getReportElementStore().getElement(elementArgs)
        break
      }

      default:
        reportElement = null
    }

    let formulaText = null
    if (reportElement) {
      formulaText = ObjectUtils.getProperty(reportElement, 'content.expression.formula.$')
    }

    this._model.setProperty('/enabled', Boolean(formulaText))
    this._model.setProperty('/formulaText', formulaText)
    this._model.setProperty('/prevFormulaText', formulaText)
    this._model.setProperty('/bid', bid)
    this._onLiveChange(formulaText)
  }

  Controller.prototype._onAccept = function (formula) {
    const context = HelperRegistry.getAppStoreHelper().getCurrentReportContext()
    const bid = this._model.getProperty('/bid')
    this._validateFormula(formula)
      .then(() => this._applyFormula(context, bid, formula))
      .catch((oError) => this._handleValidateError(oError))
  }

  Controller.prototype._validateFormula = function (formula) {
    return new Promise((resolve, reject) => {
      resolve()
    })
  }

  Controller.prototype._handleValidateError = function (oError) {
    if (oError.start && oError.length) {
      this.byId('inputField').setSelectionRange(oError.start, oError.length)
    }
    if (oError.message) {
      MessageToast.show(oError.message)
    }
  }

  Controller.prototype._applyFormula = function (context, bid, formulaText) {
    const args = ContextUtils.assign(context, {
      elementId: bid
    })

    ObjectUtils.setProperty(args, 'requestBody.element.content.expression.formula.$', formulaText)
    ActionDispatcher.fireAction(ActionRegistry.UPDATE_REPORT_ELEMENT, args)
      .then(() => {
        StoreRegistry.getReportStore().invalidateElements(args)
        HelperRegistry.getDocumentReportPageHelper().reloadDocumentReportPage()

        // Reload the report map: invalidate the previous one
        const oReportStore = StoreRegistry.getReportStore()
        oReportStore.invalidateReportMap(context)

        ActionDispatcher.fireAction(ActionRegistry.SHOW_REPORT_MAP, ContextUtils.assign(context, {
          name: oReportStore.getReport(context).name,
          userSet: true
        }))

        // Call keep alive if needed
        HelperRegistry.getKeepAliveHelper().keepAlive()
        this.handleSelectionChanged()
      })
  }

  Controller.prototype.onLiveChange = function (oEvent) {
    this._onLiveChange(oEvent.getParameter('value'))
  }

  Controller.prototype._onLiveChange = function (value) {
    this._handleSuggestions(value)
    const changed = value !== this._model.getProperty('/prevFormulaText')
    this._model.setProperty('/cancelEnabled', changed)
    this._model.setProperty('/acceptEnabled', changed)
  }

  Controller.prototype.onSuggestionsRequested = function (oEvent) {
    this._handleSuggestions(oEvent.getSource().getValue())
  }

  Controller.prototype.onSuggestionSelected = function (oEvent) {
    const suggestion = oEvent.getParameter('item').getBindingContext().getObject()
    const caret = oEvent.getSource().getCaretPosition() - 1
    const formula = oEvent.getSource().getValue()
    const wordInfos = this._extractWordAt(formula, caret)
    if (wordInfos) {
      const [newFormula, leftBracketAdded] = this._insertSuggestion(formula, suggestion, wordInfos) // eslint-disable-line
      oEvent.getSource().setValue(newFormula)

      let newCaretPosition = wordInfos.start + suggestion.text.length + 1
      if (leftBracketAdded) {
        newCaretPosition += 1
      }
      oEvent.getSource().setCaretPosition(newCaretPosition)
    }
  }

  Controller.prototype._handleSuggestions = function (formula) {
    const formulaEditor = this.byId('inputField')
    const caret = formulaEditor.getCaretPosition() - 1
    const textInfos = this._extractWordAt(formula, caret)
    let suggestions = []
    if (textInfos) {
      suggestions = this._getSuggestions(textInfos)
    }

    formulaEditor.setSuggestions(suggestions)
  }

  Controller.prototype._getSuggestions = function (textInfos) {
    const textPart = textInfos.partialWord.toLowerCase().trim()
    let suggestedfunctions = []
    if (!textInfos.withinObject) {
      const functions = StoreRegistry.getConfigurationStore().getFunctions()
      suggestedfunctions = this._match(functions, textPart, (entry) => Object.assign(entry, {
        icon: 'sap-icon://simulate',
        kind: SuggestionKind.Formula
      }))
    }

    const context = HelperRegistry.getAppStoreHelper().getCurrentDocumentContext()
    const dict = StoreRegistry.getDocumentStore().getDictionary(context)
    const dictObjects = (dict.expression || []).concat(dict.variable || []).concat(dict.link || [])
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

  Controller.prototype._match = function (suggestions, textPart, fnCallback) {
    return (suggestions || [])
      .filter((entry) => entry.name.toLowerCase().indexOf(textPart) === 0)
      .map((entry) => fnCallback({ text: entry.name }))
  }

  Controller.prototype._insertSuggestion = function (formula, suggestion, textInfos) {
    let leftBracketAdded = false
    let text = formula.substring(0, textInfos.start)
    if (suggestion.kind === SuggestionKind.Object) {
      if (text.charAt(text.length - 1) !== '[') {
        leftBracketAdded = true
        text += '['
      }
    }

    text += suggestion.text
    let remaining = formula.substring(textInfos.end + 1)
    if (suggestion.kind === SuggestionKind.Formula) {
      if (remaining.charAt(0) !== '(') {
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

  Controller.prototype._extractWordAt = function (text, position) {
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

  return Controller
})
