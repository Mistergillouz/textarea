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

    const defaultValues = [
      'Gilles',
      { $: 'Dollar', '@id': 'key' },
      { '@id': 'keyOnly' }
    ]

    const answerValuesMulti = [
      'Answer1',
      { $: 'Dollar', '@id': 'key' },
      { $: 'Sub1' }
    ]

    const answerValuesMono = [
      { $: 'Dollar', '@id': 'key' }
    ]

    const values = [
      'Gilles',
      { $: 'Dollar', '@id': 'key' },
      {
        $: 'Folder',
        nodes: [ 'Folder0', { $: 'Folder1' } ]
      },
      {
        $: 'Folder 2',
        isWithChildren: true
      }
    ]

    for (let i = 0; i < 50; i++) {
      values.push({ $: 'Value' + i })
    }

    this._model = new sap.ui.model.json.JSONModel({
      searchMode: 'Local',
      values,
      defaultValues,
      answerValues: answerValuesMono
    })
    this._model.setDefaultBindingMode(sap.ui.model.BindingMode.TwoWay)
    this.getView().setModel(this._model)
  }

  C.prototype.onSelectionChange = function (oEvent) {
    console.log(oEvent.getSource().getAnswerValues())
  }
  C.prototype.onFetchValues = function (oEvent) {
    const done = oEvent.getParameter('done')
    done([
      'Sub0',
      {
        $: 'Sub1',
        isWithChildren: true
      }
    ])
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