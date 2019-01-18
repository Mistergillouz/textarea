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

    // axios.get('data/data.json')
    //   .then(req => req.data)
    //   .then(mock => {
    //     const formulaEditor = this.byId('formulaEditor')
    //     formulaEditor.setFunctions(mock.functions)
    //     formulaEditor.setOperators(mock.operators)
    //     formulaEditor.setDictionary(mock.dico)
    //   })

    const defaultValues = [
      'Gilles',
      { $: 'Dollar', '@id': 'key' },
      { '@id': 'keyOnly' }
    ]

    const answerValuesMulti = [
      'Answer1',
      '',
      { $: 'Dollar', '@id': 'key' },
      { $: 'Sub1' }
    ]

    const answerValuesMono = [
      { $: 'Dollar', '@id': 'key' }
    ]

    const values = [
      "Le Lorem Ipsum est simplement du faux texte employé dans la composition et la mise en page avant impression. Le Lorem Ipsum est le faux texte standard de limprimerie depuis les années 1500, quand un imprimeur anonyme assembla ensemble des morceaux de texte pour réaliser un livre spécimen de polices de texte. Il n'a pas fait que survivre cinq siècles, mais s'est aussi adapté à la bureautique informatique, sans que son contenu n'en soit modifié. Il a été popularisé dans les années 1960 grâce à la vente de feuilles Letraset contenant des passages du Lorem Ipsum, et, plus récemment, par son inclusion dans des applications de mise en page de texte, comme Aldus PageMaker.",
      { $: 'Dollar', '@id': 'key' },
      { $: 'Dollar', '@id': 'keykey' },
      '',
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
      answerValues: answerValuesMulti,
      items: [
        { key: 'k1', text: 'text1', enabled: true },
        { key: 'k2', text: 'text2', enabled: false },
        { key: 'k3', text: 'text3', enabled: true }
      ]
    })
    this._model.setDefaultBindingMode(sap.ui.model.BindingMode.TwoWay)
    this.getView().setModel(this._model)
  }

  C.prototype.onShowKeys = function () {
    const lov = this.byId('lov')
    lov.setShowKeys(!lov.getShowKeys())
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

  C.prototype.onRequestContextMenu = function (oEvent) {
    const item = oEvent.getParameter('listItem').getBindingContext().getObject()
    const done = oEvent.getParameter('done')

    const menu = new sap.m.Menu({
      items: [
        new sap.m.MenuItem({
          text: "item# " + item.displayName + ' type: ' + item.nodeType,
          press: () => alert('Pressed!')
        }),
        new sap.m.MenuItem({text: "Les Gens"})
      ]
    })
  
    done(menu)
  }

  return C
});