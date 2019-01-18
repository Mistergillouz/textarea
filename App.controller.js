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

  C.prototype.onSelectionChanged = function (oEvent) {
    console.log(oEvent)
  }

  C.prototype.onRequestContextMenu = function (oEvent) {
    const item = oEvent.getParameter('listItem').getBindingContext().getObject()
    const done = oEvent.getParameter('done')
    const menuItems = []

    switch (item.nodeType) {
      case 'Reference':
        menuItems.push(new sap.m.MenuItem({
          text: 'Edit Properties',
          icon: 'sap-icon://edit',
          press: () => this._onEditReference(item)
        }))
        menuItems.push(new sap.m.MenuItem({
          text: 'Show referenced cell',
          press: () => this._onShowReferenceCell(item)
        }))
        menuItems.push(new sap.m.MenuItem({
          text: 'Delete...',
          icon: 'sap-icon://delete',
          startsSection: true,
          press: () => this._onDeleteReference(item)
        }))
        break

      case 'VariableFolder':
        menuItems.push(new sap.m.MenuItem({
          icon: 'sap-icon://create',
          text: 'Create Variable...',
          press: () => this._onCreateVariable(item)
        }))
        break

      case 'Variable':
        menuItems.push(new sap.m.MenuItem({
          icon: 'sap-icon://edit',
          text: 'Edit...',
          press: () => this._onEditVariable(item)
        }))
        menuItems.push(new sap.m.MenuItem({
          text: 'Rename...',
          press: () => this._onRenameVariable(item)
        }))

        if (item['@qualification'] !== 'Measure') {
          this._appendGeoMenu(menuItems, item, true)
        }

        menuItems.push(new sap.m.MenuItem({
          text: 'Duplicate',
          icon: 'sap-icon://duplicate',
          startsSection: true,
          press: () => this._onDuplicateVariable(item)
        }))
        menuItems.push(new sap.m.MenuItem({
          text: 'Delete...',
          icon: 'sap-icon://delete',
          startsSection: true,
          press: () => this._onDeleteVariable(item)
        }))
        break

      case 'TimeDimension':
        menuItems.push(new sap.m.MenuItem({
          text: 'Create Time Dimension...',
          icon: 'sap-icon://create-entry-time',
          press: () => this._onCreateTimeDimension(item)
        }))
        break

      case 'TimeLevel':
        menuItems.push(new sap.m.MenuItem({
          text: 'Edit Time Dimension...',
          icon: 'sap-icon://edit',
          press: () => this._onEditTimeDimension(item)
        }))

        menuItems.push(new sap.m.MenuItem({
          text: 'Delete Time Dimension...',
          icon: 'sap-icon://delete',
          press: () => this._onDeleteTimeDimension(item)
        }))
        break

      case 'Link':
        menuItems.push(new sap.m.MenuItem({
          text: 'Unmerge...',
          icon: 'sap-icon://broken-link',
          press: () => this._onUnMerge(item)
        }))

        menuItems.push(new sap.m.MenuItem({
          text: 'Edit Properties...',
          icon: 'sap-icon://edit',
          press: () => this._onEditLinkProperties(item)
        }))

        this._appendGeoMenu(menuItems, item, true)
        break
        // Fallthru

      case 'Geo':
        this._appendGeoMenu(menuItems, item, false)
        break

      case 'Object':
        const qualification = item['@qualification']
        if (qualification === 'Measure') {
          menuItems.push(new sap.m.MenuItem({
            text: 'Change Type',
            items: [
              new sap.m.MenuItem({
                text: 'Number',
                press: () => this._onChangeTypeNumber(item)
              }),
              new sap.m.MenuItem({
                text: 'Decimal',
                press: () => this._onChangeTypeDecimal(item)
              })
            ]
          }))
        } else {
          this._appendGeoMenu(menuItems, item, false)
        }
        break
    }

    if (menuItems.length) {
      const menu = new sap.m.Menu({ items: menuItems })
      done(menu)
    }
  }

  C.prototype._appendGeoMenu = function (menuItems, item, addSeparator) {
    menuItems.push(new sap.m.MenuItem({
      icon: 'sap-icon://world',
      text: 'Edit as Geography',
      startsSection: addSeparator,
      items: [
        new sap.m.MenuItem({
          text: 'By Name...',
          press: () => this._onEditAsGeoByName(item)
        }),
        new sap.m.MenuItem({
          text: 'By Latitude / Longitude...',
          press: () => this._onEditAsGeoByLongLat(item)
        })
      ]
    }))

    menuItems.push(new sap.m.MenuItem({
      text: 'Reset...',
      enabled: item.nodeType === 'Geo',
      press: () => this._onReset(item)
    }))
  }

  return C
})
