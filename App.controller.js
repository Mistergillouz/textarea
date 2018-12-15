sap.ui.define([
  "sap/ui/core/mvc/Controller",
  'ui/EnterNamePopoper'
], function (Controller, EnterNamePopover) {
  "use strict";

  const C = Controller.extend('gs.App', {})

  let count = 0

  const SuggestionKind = {
    Formula: 1,
    Object: 2
  }

  C.prototype.onInit = function () {

    axios.get('data/data.json')
      .then(req => req.data)
      .then(mock => {
        const formulaEditor = this.byId('formulaEditor')
        formulaEditor.setFunctions(mock.functions)
        formulaEditor.setOperators(mock.operators)
        formulaEditor.setDictionary(mock.dico)
      })
  }

  C.prototype.onShowFragment = function (oEvent) {
    const popover = new EnterNamePopover(this, {
      title: 'Titre',
      buttonText: 'Create',
      text: 'Ceci est le texte',
      value: 'Valeur',
      cb: (result) => console.log(result)
    })

    popover.show(oEvent.getSource())
  }

  C.prototype.onFormulaChange = function (oEvent) {
    const formula = oEvent.getParameter('formula')
    console.log(formula)
  }
  
  C.prototype._getDictionary = function () {
    return this.getView().getViewData().dict
  }

  C.prototype._getFunctions = function () {
    return this.getView().getViewData()
  }

  return C
});