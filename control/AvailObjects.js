/* global sap */
sap.ui.define([
  'sap/ui/core/Control',
  'sap/ui/model/Filter'
], function ( // eslint-disable-line
  Control,
  Filter
) {
  'use strict'

  const ViewMode = {
    Alpha: 'Alpha',
    Query: 'Query',
    Datasource: 'Datasource'
  }

  const NodeType = {
    RootNode: 'RootNode',
    Object: 'Object',
    VariableFolder: 'VariableFolder',
    Variable: 'Variable',
    ReferenceFolder: 'ReferenceFolder',
    Reference: 'Reference',
    DataProvider: 'DataProvider',
    DataSource: 'DataSource',
    DataSourceFolder: 'DataSourceFolder'
  }

  const AvailObjects = Control.extend('sap.bi.webi.ui.control.AvailObjects', {
    metadata: {
      properties: {
        width: {
          type: 'sap.ui.core.CSSSize',
          defaultValue: '100%'
        },
        height: {
          type: 'sap.ui.core.CSSSize',
          defaultValue: '100%'
        },
        multiSelection: {
          type: 'boolean',
          defaultValue: true
        },
        allowSearch: {
          type: 'boolean',
          defaultValue: true
        }
      },
      events: {
        requestContextMenu: {},
        selectionChange: {}
      }
    },
    renderer: (out, self) => self._render(out)
  })

  AvailObjects.prototype.init = function () {
    this._viewMode = null
    this._i18nModel = new sap.ui.model.resource.ResourceModel({
      bundleUrl: 'data/i18n_dev.properties'
    })

    this._model = new sap.ui.model.json.JSONModel({
      nodes: [],
      showFooter: true,
      viewMode: ViewMode.Alpha,
      select: [
        {
          key: ViewMode.Alpha,
          text: '<<Alpha>>'
        },
        {
          key: ViewMode.Query,
          text: '<<Query>>'
        },
        {
          key: ViewMode.Datasource,
          text: '<<DataSource>>'
        }
      ]
    })

    this._model.setDefaultBindingMode(sap.ui.model.BindingMode.TwoWay)
    this._createUI()

    fetch('control/objects.json')
      .then(res => res.json())
      .then(res => this._model.setProperty('/trees', res))
      .then(() => this._setViewMode(ViewMode.Alpha))
  }

  AvailObjects.prototype._render = function (out) {
    out.write('<div')
    out.writeControlData(this)
    out.addClass('sapWiseAvailObjects sapUiSizeCompact')
    out.writeClasses()
    out.addStyle('width', this.getWidth())
    out.addStyle('height', this.getHeight())
    out.writeStyles()
    out.write('>')
    out.renderControl(this._mainPage)
    out.write('</div>')
  }

  /************************
  // PROPERTIES HANDLERS
  *************************/

  AvailObjects.prototype.setAllowSearch = function (allow) {
    this.setProperty('allowSearch', allow, true)
    this._mainPage.setShowHeader(allow)
  }

  AvailObjects.prototype.setMultiSelection = function (multi) {
    this.setProperty('multiSelection', multi, true)
    this._tree.setMode(multi ? 'MultiSelect' : 'SingleSelectMaster')
  }

  /***********************
  // EVENT HANDLERS
  ************************/

  AvailObjects.prototype._onContextMenu = function (oMouseEvent) {
    oMouseEvent.preventDefault()
    const items = this._tree.getItems()
    const listItem = items.find((item) => item.getDomRef().contains(oMouseEvent.target))
    if (listItem) {
      this.fireRequestContextMenu({
        listItem,
        done: (menu) => {
          menu.openAsContextMenu(oMouseEvent, listItem)
        }
      })
    }
  }
  
  AvailObjects.prototype._onSearch = function (oEvent) {
    // add filter for search
    const aFilters = []
    var sQuery = oEvent.getSource().getValue()
    if (sQuery && sQuery.length > 0) {
      var filter = new Filter('text', sap.ui.model.FilterOperator.Contains, sQuery)
      aFilters.push(filter)
    }

    // update list binding
    const binding = this._tree.getBinding('items')
    binding.filter(aFilters, 'Application')
    this._tree.rerender()
  }

  /***********************
  // INTERNAL FUNCTIONS
  ************************/

  AvailObjects.prototype._setViewMode = function (viewMode) {
    const trees = this._model.getProperty('/trees')

    let tree = null
    switch (viewMode) {
      case ViewMode.Alpha:
        tree = trees.byAlpha
        break
      case ViewMode.Query:
        tree = trees.byQuery
        break
      case ViewMode.Datasource:
        tree = trees.byFolders
        break
      default:
        tree = null
    }

    let nodes = []
    if (tree) {
      const availObjects = tree.AvailableObjects
      if (Array.isArray(availObjects)) {
        nodes = nodes.concat(this._processObjects(availObjects))
      } else if (Array.isArray(tree.DataProviders)) {
        const dpNodes = tree.DataProviders.map((dp) => {
          const dpNode = this._toDataProvider(dp)
          dpNode.nodes = this._processObjects(dp.children)
          delete dpNode.children
          return dpNode
        })

        nodes = nodes.concat(dpNodes)
      } else if (Array.isArray(tree.universeFolders)) {
        const dsNodes = tree.universeFolders.map((ds) => {
          const dsNode = this._toDataSource(ds)
          dsNode.nodes = ds.children.map((dsFolder) => {
            const dsFolderNode = this._toDataSourceFolder(dsFolder)
            dsFolderNode.nodes = this._processObjects(dsFolder.children)
            return dsFolderNode
          })
          delete dsNode.children
          return dsNode
        })

        nodes = nodes.concat(dsNodes)
      }

      const variables = tree.Variables
      if (variables) {
        if (Array.isArray(variables.variables)) {
          const variablesNode = {
            displayName: '<<Variables>>',
            nodeType: NodeType.VariableFolder,
            icon: 'sap-icon://folder-blank',
            nodes: variables.variables.map((variable) => this._toVariable(variable))
          }
          nodes.push(variablesNode)
        }
        if (Array.isArray(variables.references)) {
          const refsNode = {
            displayName: '<<References>>',
            nodeType: NodeType.ReferenceFolder,
            icon: 'sap-icon://folder-blank',
            nodes: variables.references.map((reference) => this._toReference(reference))
          }
          nodes.push(refsNode)
        }
      }
    }

    const rootNode = {
      nodeType: NodeType.RootNode,
      displayName: '<<document name>>',
      icon: 'sap-icon://document-text',
      nodes
    }

    this._model.setProperty('/nodes', rootNode)
    this._model.setProperty('/viewMode', viewMode)
    this._tree.removeSelections(true)
    this._tree.rerender()

    if (viewMode === ViewMode.Datasource) {
      this._model.setProperty('/showFooter', false)
    }
  }

  AvailObjects.prototype._createUI = function () {
    this._tree = new sap.m.Tree({
      includeItemInSelection: true
    })

    this._tree.attachBrowserEvent('contextmenu', (oEvent) => this._onContextMenu(oEvent))
    this._tree.attachToggleOpenState(() => this._tree.rerender())

    this._tree.setModel(this._model)
    const item = new sap.m.StandardTreeItem({
      icon: '{icon}',
      title: '{displayName}'
    })

    // const customData = new sap.ui.core.CustomData({
    //   key: 'selectable',
    //   value: '{= ${selectable} === false ? "false" : "true" }',
    //   writeToDom: true
    // })

    // item.addCustomData(customData)

    this._tree.bindAggregation('items', {
      path: '/nodes',
      template: item
    })

    const header = new sap.m.Toolbar({
      content: [
        new sap.m.SearchField({
          liveChange: (oEvent) => this._onSearch(oEvent)
        })
      ]
    })

    const select = new sap.m.Select({
      change: (oEvent) => this._setViewMode(oEvent.getParameter('selectedItem').getKey())
    })

    const selectTemplate = new sap.ui.core.Item({
      key: '{key}',
      text: '{text}'
    })

    select.setModel(this._model)
    select.bindAggregation('items', '/select', selectTemplate)
    this._attachProperty(select, 'selectedKey', '/viewMode')

    const footer = new sap.m.Toolbar({
      design: sap.m.ToolbarDesign.Transparent,
      content: [select]
    })

    this._mainPage = new sap.m.Page({
      showHeader: true,
      customHeader: header,
      showFooter: false,
      footer,
      content: new sap.m.ScrollContainer({
        height: '100%',
        vertical: true,
        content: this._tree
      })
    })

    this._attachProperty(this._mainPage, 'showFooter', '/showFooter')

    this.setMultiSelection(this.getMultiSelection())
    this.setAllowSearch(this.getAllowSearch())
  }

  /****************
  // FORMATTERS
  *****************/

  /********************
  // UTILITY FUNCTIONS
  *********************/

  AvailObjects.prototype._processObjects = function (objects) {
    const map = {}
    objects.forEach((object) => {
      if (!map[object.name]) {
        map[object.name] = 0
      }

      map[object.name] += 1
    })

    return objects.map((object) => {
      const entry = this._toDpObject(object)
      if (map[object.name] > 1) {
        entry.displayName += ` (${object.dpName})`
      }
      return entry
    })
  }

  AvailObjects.prototype._toDpObject = function (dpObject) {
    return Object.assign({}, dpObject, {
      nodeType: NodeType.Object,
      icon: 'sap-icon://accept',
      displayName: dpObject.name
    })
  }

  AvailObjects.prototype._toVariable = function (variable) {
    return Object.assign({}, variable, {
      nodeType: NodeType.Variable,
      icon: 'sap-icon://activate',
      displayName: variable.name
    })
  }

  AvailObjects.prototype._toReference = function (ref) {
    return Object.assign({}, ref, {
      nodeType: NodeType.Reference,
      icon: 'sap-icon://attachment-video',
      displayName: ref.name
    })
  }

  AvailObjects.prototype._toDataProvider = function (dp) {
    return Object.assign({}, dp, {
      nodeType: NodeType.DataProvider,
      icon: 'sap-icon://folder-blank',
      displayName: dp.name
    })
  }

  AvailObjects.prototype._toDataSource = function (unv) {
    return Object.assign({}, unv, {
      nodeType: NodeType.DataSource,
      icon: 'sap-icon://folder-blank',
      displayName: unv.name
    })
  }

  AvailObjects.prototype._toDataSourceFolder = function (unvFolder) {
    return {
      displayName: unvFolder.name,
      icon: 'sap-icon://folder-blank',
      nodeType: NodeType.UniverseFolder
    }
  }

  AvailObjects.prototype._processTree = function (inNodes, depth = 0) {
    const nodes = inNodes.map((inNode) => {
      const node = Object.assign({}, inNode)
      if (node.nodes) {
        node.nodes = this._processNodes(node.nodes, depth + 1)
      }
      node.selectable = String(depth > 0)
      return node
    })

    return nodes
  }

  AvailObjects.prototype._attachProperty = function (component, property, value, callback) {
    component.setModel(this._model)
    component.bindProperty(property, value, callback)
  }

  return AvailObjects
})
