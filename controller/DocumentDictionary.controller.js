/* eslint-disable no-unused-vars */
sap.ui.define([
  // 'sap/bi/webi/controller/BaseController',
  // 'sap/bi/smart/core/store/StoreRegistry',
  // 'sap/bi/webi/core/flux/core/HelperRegistry',
  'sap/bi/webi/lib/UI5Utils'
], function ( // eslint-disable-line
  // BaseController,
  // StoreRegistry,
  // HelperRegistry,
  UI5Utils
) {
  'use strict'

  const NodeType = {
    RootNode: 'RootNode',
    Object: 'Object',
    LinkFolder: 'LinkFolder',
    Link: 'Link',
    TimeDimension: 'TimeDimension',
    TimeLevel: 'TimeLevel',
    Geo: 'Geo',
    GeoLevel: 'GeoLevel',
    VariableFolder: 'VariableFolder',
    Variable: 'Variable',
    ReferenceFolder: 'ReferenceFolder',
    Reference: 'Reference',
    DataProvider: 'DataProvider',
    DataSource: 'DataSource',
    DataSourceFolder: 'DataSourceFolder'
  }

  const NodeState = {
    Normal: 'Normal',
    Incompatible: 'Incompatible'
  }

  // const Controller = BaseController.extend(
  //   'sap.bi.webi.components.document.dictionary.controller.DocumentDictionary', {}
  // )

  const Controller = sap.ui.core.mvc.Controller.extend(
    'sap.bi.webi.components.document.dictionary.controller.DocumentDictionary', {}
  )
  //
  // INITIALIZATION & BINDING
  //
  Controller.prototype.onInit = function () {
    // BaseController.prototype.onInit.call(this)
    this._model = new sap.ui.model.json.JSONModel({
      dictionary: {},
      documentName: '',
      selectMode: 'None'
    })
    this.getView().setModel(this._model)
    this._handleDocumentContextChanged()

    // StoreRegistry.getAppStore().register('/context/report/current', this._handleDocumentContextChanged, this)
  }

  Controller.prototype._handleDocumentContextChanged = function () {
    // const context = HelperRegistry.getAppStoreHelper().getCurrentReportContext()
    // const dictionary = StoreRegistry.getDocumentStore().getDictionary(context)
    // const document = StoreRegistry.getDocumentStore().getDocument(context)

    fetch('control/objects.json')
      .then(res => res.json())
      .then((dictionary) => {
        this._model.setProperty('/documentName', 'TODO' /* document.name */)
        this._model.setProperty('/dictionary', dictionary)
        this._buildModel()
      })
  }

  //
  // VIEW CALLBACKS
  //

  Controller.prototype.onMultiSelect = function () {
    this._model.setProperty('/selectMode', 'MultiSelect')
  }
  Controller.prototype.onMoreMenuPressed = function (oEvent) {
    const item = oEvent.getSource().getBindingContext().getObject()
    const menuItems = this._buildMenuItems(item)
    if (menuItems && menuItems.length) {
      const menu = new sap.m.Menu({
        items: menuItems
      })
      const rect = oEvent.getSource().getDomRef().getBoundingClientRect()
      menu.openAsContextMenu({ offsetX: 0, offsetY: rect.height }, oEvent.getSource())
    }
  }

  Controller.prototype.onSearch = function (oEvent) {
    const query = oEvent.getParameter('newValue')
    // add filter for search
    const aFilters = []
    if (query && query.length > 0) {
      var filter = new sap.ui.model.Filter('displayName', sap.ui.model.FilterOperator.Contains, query)
      aFilters.push(filter)
    }

    const ids = [
      'treeDimensions',
      'treeMeasures',
      'treeVariables',
      'treeReferences'
    ]

    // update list binding
    ids.forEach((id) => {
      const binding = this.byId(id).getBinding('items')
      binding.filter(aFilters, 'Application')
    })
  }

  //
  // INTERNAL METHODS
  //

  Controller.prototype._buildModel = function () {
    let expressions = []
    const dictExpressions = this._getExpressions()
    for (let i = 0; i < dictExpressions.length; i++) {
      const expression = dictExpressions[i]
      const entry = this._toDpObject(expression)
      entry.nodes = []
      while ((i + 1) < dictExpressions.length) {
        const otherExpression = dictExpressions[i + 1]
        if (otherExpression.associatedDimensionId === expression.id) {
          entry.nodes.push(this._toDpObject(otherExpression))
          i += 1
        } else {
          break
        }
      }
      if (entry.natureId) {
        this._applyNatureId(entry)
      }
      expressions.push(entry)
    }

    // Add links and remove it from expressions
    if (Array.isArray(this._getLinks())) {
      const linkNodes = this._getLinks().map((link) => this._processLink(link, expressions, true))
      expressions = expressions.concat(linkNodes)
    }

    // Take care of objects with same name coming from differents dataproviders
    this._fixDuplicate(expressions)

    // Finally sort the list!
    expressions.sort((a, b) => a.displayName.localeCompare(b.displayName))

    const dimensions = []
    const measures = []
    expressions.forEach((expression) => {
      if (expression['@qualification'] === 'Measure') {
        measures.push(expression)
      } else {
        dimensions.push(expression)
      }
    })

    this._model.setProperty('/dimensions', dimensions)
    this._model.setProperty('/measures', measures)

    // Handle variables
    const variables = this._getVariables().map((variable) => this._toVariable(variable))
    this._model.setProperty('/variables', variables)

    // Handle references
    const references = this._getReferences().map((reference) => this._toReference(reference))
    this._model.setProperty('/references', references)
  }

  Controller.prototype._buildMenuItems = function (item) {
    const menuItems = []

    switch (item.nodeType) {
      case NodeType.Reference:
        menuItems.push(new sap.m.MenuItem({
          text: UI5Utils.getLocalizedText('aot.editProperties'),
          icon: 'sap-icon://edit',
          press: () => this._onEditReference(item)
        }))
        menuItems.push(new sap.m.MenuItem({
          text: UI5Utils.getLocalizedText('aot.showReferencedCell'),
          press: () => this._onShowReferenceCell(item)
        }))
        menuItems.push(new sap.m.MenuItem({
          text: UI5Utils.getLocalizedText('aot.delete'),
          icon: 'sap-icon://delete',
          startsSection: true,
          press: () => this._onDeleteReference(item)
        }))
        break

        // case NodeType.VariableFolder:
        //   menuItems.push(new sap.m.MenuItem({
        //     icon: 'sap-icon://create',
        //     text: UI5Utils.getLocalizedText('aot.createVariable'),
        //     press: () => this._onCreateVariable(item)
        //   }))
        //   break

      case NodeType.Variable:
        menuItems.push(new sap.m.MenuItem({
          icon: 'sap-icon://edit',
          text: UI5Utils.getLocalizedText('aot.editVariable'),
          press: () => this._onEditVariable(item)
        }))
        menuItems.push(new sap.m.MenuItem({
          text: UI5Utils.getLocalizedText('aot.renameVariable'),
          press: () => this._onRenameVariable(item)
        }))

        if (item['@qualification'] !== 'Measure') {
          this._appendGeoMenu(menuItems, item, true)
        }

        menuItems.push(new sap.m.MenuItem({
          text: UI5Utils.getLocalizedText('aot.duplicateVariable'),
          icon: 'sap-icon://duplicate',
          startsSection: true,
          press: () => this._onDuplicateVariable(item)
        }))
        menuItems.push(new sap.m.MenuItem({
          text: UI5Utils.getLocalizedText('aot.deleteVariable'),
          icon: 'sap-icon://delete',
          startsSection: true,
          press: () => this._onDeleteVariable(item)
        }))
        break

      case NodeType.TimeDimension:
        menuItems.push(new sap.m.MenuItem({
          text: UI5Utils.getLocalizedText('aot.createTimeDimension'),
          icon: 'sap-icon://create-entry-time',
          press: () => this._onCreateTimeDimension(item)
        }))
        break

      case NodeType.TimeLevel:
        menuItems.push(new sap.m.MenuItem({
          text: UI5Utils.getLocalizedText('aot.editTimeDimension'),
          icon: 'sap-icon://edit',
          press: () => this._onEditTimeDimension(item)
        }))

        menuItems.push(new sap.m.MenuItem({
          text: UI5Utils.getLocalizedText('aot.deleteTimeDimension'),
          icon: 'sap-icon://delete',
          press: () => this._onDeleteTimeDimension(item)
        }))
        break

      case NodeType.Link:
        menuItems.push(new sap.m.MenuItem({
          text: UI5Utils.getLocalizedText('aot.unmergeLink'),
          icon: 'sap-icon://broken-link',
          press: () => this._onUnMerge(item)
        }))

        menuItems.push(new sap.m.MenuItem({
          text: UI5Utils.getLocalizedText('aot.editLinkProperties'),
          icon: 'sap-icon://edit',
          press: () => this._onEditLinkProperties(item)
        }))

        this._appendGeoMenu(menuItems, item, true)
        break

      case NodeType.Geo:
        this._appendGeoMenu(menuItems, item, false)
        break

      case NodeType.Object: {
        const qualification = item['@qualification']
        if (qualification === 'Measure') {
          menuItems.push(new sap.m.MenuItem({
            text: UI5Utils.getLocalizedText('aot.changeMeasureType'),
            items: [
              new sap.m.MenuItem({
                text: UI5Utils.getLocalizedText('aot.changeMesureType.number'),
                press: () => this._onChangeTypeNumber(item)
              }),
              new sap.m.MenuItem({
                text: UI5Utils.getLocalizedText('aot.changeMesureType.decimal'),
                press: () => this._onChangeTypeDecimal(item)
              })
            ]
          }))
        } else {
          this._appendGeoMenu(menuItems, item, false)
        }
        break
      }

      default:
    }

    return menuItems
  }

  Controller.prototype._appendGeoMenu = function (menuItems, item, addSeparator) {
    menuItems.push(new sap.m.MenuItem({
      icon: 'sap-icon://world',
      text: UI5Utils.getLocalizedText('aot.editAsGeo'),
      startsSection: addSeparator,
      items: [
        new sap.m.MenuItem({
          text: UI5Utils.getLocalizedText('aot.editAsGeo.byName'),
          press: () => this._onEditAsGeoByName(item)
        }),
        new sap.m.MenuItem({
          text: UI5Utils.getLocalizedText('aot.editAsGeo.byLongLat'),
          press: () => this._onEditAsGeoByLongLat(item)
        })
      ]
    }))

    menuItems.push(new sap.m.MenuItem({
      text: UI5Utils.getLocalizedText('aot.resetGeo'),
      enabled: item.nodeType === 'Geo',
      press: () => this._onResetGeo(item)
    }))
  }

  Controller.prototype._processLink = function (link, expressions, deleteExpression) {
    const linkNode = this._toLink(link)
    linkNode.nodes = []
    link.linkedExpressions.linkedExpression.forEach((linkExpression) => {
      const index = expressions.findIndex((expr) => expr.id === linkExpression['@id'])
      if (index !== -1) {
        const expression = expressions[index]
        expression.displayName += ` (${expression.dataProviderName})`
        linkNode.nodes.push(expression)
        // In the view alpha mode, linkedExpressions need to be removed from the list (else it will appear twice)
        if (deleteExpression) {
          expressions.splice(index, 1)
        }
      }
    })
    return linkNode
  }

  Controller.prototype._getExpressions = function () {
    const expressions = this._model.getProperty('/dictionary').expression
    return expressions || []
  }

  Controller.prototype._getLinks = function () {
    const links = this._model.getProperty('/dictionary').link
    return Array.isArray(links) && links.length ? links : null
  }

  Controller.prototype._getVariables = function () {
    const variables = this._model.getProperty('/dictionary').variable
    return variables || []
  }

  Controller.prototype._getReferences = function () {
    const references = this._model.getProperty('/dictionary').refcell
    return references || []
  }

  Controller.prototype._fixDuplicate = function (expressions) {
    const map = {}
    expressions.forEach((object) => {
      if (!map[object.name]) {
        map[object.name] = 0
      }

      map[object.name] += 1
    })

    expressions.forEach((object) => {
      if (map[object.name] > 1) {
        object.displayName += ` (${object.dataProviderName})`
      }
    })
  }

  Controller.prototype._toDpObject = function (dpObject) {
    return this._newEntry(NodeType.Object, dpObject, {
      icon: 'sap-icon://accept',
      displayName: dpObject.name
    })
  }

  Controller.prototype._toLink = function (link) {
    return this._newEntry(NodeType.Link, link, {
      icon: 'sap-icon://chain-link',
      displayName: link.name
    })
  }

  Controller.prototype._toVariable = function (variable) {
    return this._newEntry(NodeType.Variable, variable, {
      icon: 'sap-icon://activate',
      displayName: variable.name
    })
  }

  Controller.prototype._toReference = function (ref) {
    return this._newEntry(NodeType.Reference, ref, {
      icon: 'sap-icon://attachment-video',
      displayName: ref.name
    })
  }

  Controller.prototype._toDataProvider = function (dp) {
    return this._newEntry(NodeType.DataProvider, dp, {
      icon: 'sap-icon://folder-blank',
      displayName: dp.name
    })
  }

  Controller.prototype._toDataSource = function (unv) {
    return this._newEntry(NodeType.DataSource, unv, {
      icon: 'sap-icon://folder-blank',
      displayName: unv.name
    })
  }

  Controller.prototype._toDataSourceFolder = function (unvFolder) {
    return this._newEntry(NodeType.UniverseFolder, unvFolder, {
      displayName: unvFolder.name,
      icon: 'sap-icon://folder-blank'
    })
  }

  Controller.prototype._newEntry = function (nodeType, object, args) {
    return Object.assign({
      nodeType,
      nodeState: NodeState.Normal,
      hasMoreMenu: true
    }, object, args)
  }

  Controller.prototype._applyNatureId = function (node) {
    let icon = null
    let nodeType = null
    let nodeLevelType = null

    switch (node.natureId) {
      case 'Time':
        icon = 'sap-icon://history'
        nodeType = NodeType.TimeDimension
        nodeLevelType = NodeType.TimeLevel
        break
      case 'Geography':
        icon = 'sap-icon://world'
        nodeType = NodeType.Geo
        nodeLevelType = NodeType.GeoLevel
        break

      default:
    }

    if (icon && nodeType) {
      node.icon = icon
      node.nodeType = nodeType
      node.nodes.forEach((childNode) => {
        childNode.hasMoreMenu = false
        childNode.nodeType = nodeLevelType
      })
    }
  }
  //
  // MENU HANDLERS
  //
  Controller.prototype._onEditReference = function (item) {
    this._notYet('_onEditReference')
  }

  Controller.prototype._onShowReferenceCell = function (item) {
    this._notYet('_onShowReferenceCell')
  }

  Controller.prototype._onDeleteReference = function (item) {
    this._notYet('_onDeleteReference')
  }

  Controller.prototype.onCreateVariable = function (item) {
    this._notYet('_onCreateVariable')
  }

  Controller.prototype._onEditVariable = function (item) {
    this._notYet('_onEditVariable')
  }

  Controller.prototype._onRenameVariable = function (item) {
    this._notYet('_onRenameVariable')
  }

  Controller.prototype._onDuplicateVariable = function (item) {
    this._notYet('_onDuplicateVariable')
  }

  Controller.prototype._onDeleteVariable = function (item) {
    this._notYet('_onDeleteVariable')
  }

  Controller.prototype._onCreateTimeDimension = function (item) {
    this._notYet('_onCreateTimeDimension')
  }

  Controller.prototype._onEditTimeDimension = function (item) {
    this._notYet('_onEditTimeDimension')
  }

  Controller.prototype._onDeleteTimeDimension = function (item) {
    this._notYet('_onDeleteTimeDimension')
  }

  Controller.prototype._onUnMerge = function (item) {
    this._notYet('_onUnMerge')
  }

  Controller.prototype._onEditLinkProperties = function (item) {
    this._notYet('_onEditLinkProperties')
  }

  Controller.prototype._onChangeTypeNumber = function (item) {
    this._notYet('_onChangeTypeNumber')
  }

  Controller.prototype._onChangeTypeDecimal = function (item) {
    this._notYet('_onChangeTypeDecimal')
  }

  Controller.prototype._onEditAsGeoByName = function (item) {
    this._notYet('_onEditAsGeoByName')
  }

  Controller.prototype._onEditAsGeoByLongLat = function (item) {
    this._notYet('onEditAsGeoByLongLat')
  }

  Controller.prototype._onResetGeo = function (item) {
    this._notYet('_onResetGeo')
  }

  Controller.prototype._notYet = function (message) {
    sap.m.MessageToast.show(`${message}: Not yet implemented`)
  }

  return Controller
})
