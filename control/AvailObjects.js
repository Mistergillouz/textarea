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
        },
        // If you have a full dictionary object use it else
        // use each others properties (expressions/var/ref/links)
        dictionary: {
          type: 'object',
          defaultValue: null
        },
        expressions: {
          type: 'array',
          defaultValue: null
        },
        variables: {
          type: 'array',
          defaultValue: null
        },
        references: {
          type: 'array',
          defaultValue: null
        },
        links: {
          type: 'array',
          defaultValue: null
        }
      },
      events: {
        requestContextMenu: {},
        selectionChanged: {}
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
      .then(res => {
        this.setDictionary(res)
        // this.setExpressions(res.expression)
        // this.setVariables(res.variable)
        // this.setReferences(res.reference)
        // this.setLinks(res.link)
      })
      .then(() => this._setViewMode(ViewMode.Query))
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

  AvailObjects.prototype.setDictionary = function (dictionary) {
    this.setProperty('expressions', dictionary.expression || [], true)
    this.setProperty('variables', dictionary.variable || [], true)
    this.setProperty('references', dictionary.refcell || [], true)
    this.setProperty('links', dictionary.link || [], true)
    this._buildTree()
  }

  AvailObjects.prototype.setExpressions = function (expressions) {
    this.setProperty('expressions', expressions || [], true)
    this._buildTree()
  }

  AvailObjects.prototype.setVariables = function (variables) {
    this.setProperty('variables', variables || [], true)
    this._buildTree()
  }

  AvailObjects.prototype.setReferences = function (references) {
    this.setProperty('references', references || [], true)
    this._buildTree()
  }

  AvailObjects.prototype.setLinks = function (links) {
    this.setProperty('links', links || [], true)
    this._buildTree()
  }

  /***********************
  // EVENT HANDLERS
  ************************/

  AvailObjects.prototype._onSelectionChanged = function (oEvent) {
    const listItems = this._tree.getSelectedItems()
    this.fireSelectionChanged({
      listItems
    })

    // T0D0: A optimiser
    this._handleIncompatibleObjects(listItems)
    this._model.refresh(true)
    // this._tree.rerender()
  }

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
    this._model.setProperty('/viewMode', viewMode)
    this._select.setSelectedKey(viewMode)
    this._buildTree()
  }

  AvailObjects.prototype._buildTree = function () {
    let nodes = []
    let expressions = []
    const viewMode = this._model.getProperty('/viewMode')
    const dictExpressions = this.getExpressions()
    for (let i = 0; i < dictExpressions.length; i++) {
      const expression = dictExpressions[i]
      const entry = this._toDpObject(expression)
      if (expression.natureId) {
        entry.nodes = []
        while (i < dictExpressions.length) {
          const otherExpression = dictExpressions[i + 1]
          if (otherExpression.associatedDimensionId === expression.id) {
            entry.nodes.push(this._toDpObject(otherExpression))
            i += 1
          } else {
            break
          }
        }
        this._applyNatureId(entry)
      }
      expressions.push(entry)
    }

    switch (viewMode) {
      case ViewMode.Query:

        // Split each object in its own dataprovider folder
        const dpMap = {}
        const dpNames = {}
        expressions.forEach((expression) => {
          if (!dpMap[expression.dataProviderId]) {
            dpMap[expression.dataProviderId] = []
            dpNames[expression.dataProviderId] = expression.dataProviderName
          }

          dpMap[expression.dataProviderId].push(expression)
        })

        // Create dataprovider folders
        const dpNodes = Object.keys(dpMap).map((dpId) => {
          const dpNode = this._toDataProvider({
            dpId,
            name: dpNames[dpId],
            nodes: dpMap[dpId]
          })
          return dpNode
        })
        nodes = nodes.concat(dpNodes)

        // Create a merged dimensions folder with all links
        if (Array.isArray(this.getLinks())) {
          const linkFolderNode = this._newEntry(NodeType.LinkFolder, {
            displayName: '<<Merged Dimensions>>',
            icon: 'sap-icon://folder-blank',
            nodes: this.getLinks().map((link) => this._processLink(link, expressions, viewMode))
          })

          nodes.push(linkFolderNode)
        }
        break

      case ViewMode.Alpha:
        // Add links and remove it from expressions
        if (Array.isArray(this.getLinks())) {
          const linkNodes = this.getLinks().map((link) => this._processLink(link, expressions, viewMode))
          expressions = expressions.concat(linkNodes)
        }

        // Take care of objects with same name coming from differents dataproviders
        this._fixDuplicate(expressions)
        // Finally sort the list!
        expressions.sort((a, b) => a.displayName.localeCompare(b.displayName))
        nodes = nodes.concat(expressions)
        break

      default:
    }

    // Handle variables
    if (Array.isArray(this.getVariables())) {
      const variablesNode = this._newEntry(NodeType.VariableFolder, {
        displayName: '<<Variables>>',
        icon: 'sap-icon://folder-blank',
        nodes: this.getVariables().map((variable) => this._toVariable(variable))
      })
      nodes.push(variablesNode)
    }

    // Handle references
    if (Array.isArray(this.getReferences())) {
      const refsNode = this._newEntry(NodeType.ReferenceFolder, {
        displayName: '<<References>>',
        icon: 'sap-icon://folder-blank',
        nodes: this.getReferences().map((reference) => this._toReference(reference))
      })
      nodes.push(refsNode)
    }

    const rootNode = this._newEntry(NodeType.RootNode, {
      displayName: '<<document name>>',
      icon: 'sap-icon://document-text',
      nodes
    })

    this._model.setProperty('/nodes', [rootNode])
    this._tree.expandToLevel(1)
    this._tree.removeSelections(true)
    this._tree.rerender()
  }

  AvailObjects.prototype._createUI = function () {
    this._tree = new sap.m.Tree({
      includeItemInSelection: true,
      selectionChange: (oEvent) => this._onSelectionChanged(oEvent)
    })

    this._tree.attachBrowserEvent('contextmenu', (oEvent) => this._onContextMenu(oEvent))
    this._tree.attachToggleOpenState(() => this._tree.rerender())

    this._tree.setModel(this._model)
    const item = new sap.m.StandardTreeItem({
      icon: '{icon}',
      title: '{displayName}'
    })

    const customData = new sap.ui.core.CustomData({
      key: 'state',
      value: '{nodeState}',
      writeToDom: true
    })

    item.addCustomData(customData)

    this._tree.bindAggregation('items', {
      path: '/nodes',
      template: item,
      parameters: {
        arrayNames: ['nodes']
      }
    })

    const header = new sap.m.Toolbar({
      content: [
        new sap.m.SearchField({
          liveChange: (oEvent) => this._onSearch(oEvent)
        })
      ]
    })

    this._select = new sap.m.Select({
      change: (oEvent) => this._setViewMode(oEvent.getParameter('selectedItem').getKey())
    })

    const selectTemplate = new sap.ui.core.Item({
      key: '{key}',
      text: '{text}'
    })

    this._select.setModel(this._model)
    this._select.bindAggregation('items', '/select', selectTemplate)

    const footer = new sap.m.Toolbar({
      design: sap.m.ToolbarDesign.Transparent,
      content: [this._select]
    })

    this._mainPage = new sap.m.Page({
      showHeader: true,
      customHeader: header,
      showFooter: true,
      footer,
      content: new sap.m.ScrollContainer({
        height: '100%',
        vertical: true,
        content: this._tree
      })
    })

    this.setMultiSelection(this.getMultiSelection())
    this.setAllowSearch(this.getAllowSearch())
  }

  /********************
  // UTILITY FUNCTIONS
  *********************/

  AvailObjects.prototype._processLink = function (link, expressions, viewMode) {
    const linkNode = this._toLink(link)
    linkNode.nodes = []
    link.linkedExpressions.linkedExpression.forEach((linkExpression) => {
      const index = expressions.findIndex((expr) => expr.id === linkExpression['@id'])
      if (index !== -1) {
        const expression = expressions[index]
        expression.displayName += ` (${expression.dataProviderName})`
        linkNode.nodes.push(expression)
        // In the view alpha mode, linkedExpressions need to be removed from the list (else it will appear twice)
        if (viewMode === ViewMode.Alpha) {
          expressions.splice(index, 1)
        }
      }
    })
    return linkNode
  }

  AvailObjects.prototype._fixDuplicate = function (objects) {
    const map = {}
    objects.forEach((object) => {
      if (!map[object.name]) {
        map[object.name] = 0
      }

      map[object.name] += 1
    })

    objects.forEach((object) => {
      if (map[object.name] > 1) {
        object.displayName += ` (${object.dataProviderName})`
      }
    })
  }

  AvailObjects.prototype._toDpObject = function (dpObject) {
    return this._newEntry(NodeType.Object, dpObject, {
      icon: 'sap-icon://accept',
      displayName: dpObject.name
    })
  }

  AvailObjects.prototype._toLink = function (link) {
    return this._newEntry(NodeType.Link, link, {
      icon: 'sap-icon://chain-link',
      displayName: link.name
    })
  }

  AvailObjects.prototype._toVariable = function (variable) {
    return this._newEntry(NodeType.Variable, variable, {
      icon: 'sap-icon://activate',
      displayName: variable.name
    })
  }

  AvailObjects.prototype._toReference = function (ref) {
    return this._newEntry(NodeType.Reference, ref, {
      icon: 'sap-icon://attachment-video',
      displayName: ref.name
    })
  }

  AvailObjects.prototype._toDataProvider = function (dp) {
    return this._newEntry(NodeType.DataProvider, dp, {
      icon: 'sap-icon://folder-blank',
      displayName: dp.name
    })
  }

  AvailObjects.prototype._toDataSource = function (unv) {
    return this._newEntry(NodeType.DataSource, unv, {
      icon: 'sap-icon://folder-blank',
      displayName: unv.name
    })
  }

  AvailObjects.prototype._toDataSourceFolder = function (unvFolder) {
    return this._newEntry(NodeType.UniverseFolder, unvFolder, {
      displayName: unvFolder.name,
      icon: 'sap-icon://folder-blank'
    })
  }

  AvailObjects.prototype._newEntry = function (nodeType, object, args) {
    return Object.assign({
      nodeType,
      nodeState: NodeState.Normal
    }, object, args)
  }

  AvailObjects.prototype._applyNatureId = function (node) {
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
      node.nodes.forEach((childNode) => (childNode.nodeType = nodeLevelType))
    }
  }

  // Code taken from ajaxResultObjects.js function setIncompatibleObjects(node, arrDPNames) 
  AvailObjects.prototype._handleIncompatibleObjects = function (selectedItems) {
    const arrDPNames = []
    selectedItems.forEach((item) => {
      const node = item.getBindingContext().getObject()
      const qualification = node['@qualification']
      if (qualification && qualification !== 'Measure') {
        let names = this._getLinkedObjectDpNames(node.id)
        if (names.length === 0) {
          names = [node.dataProviderName]
        }
        names.forEach((name) => {
          if (name && arrDPNames.indexOf(name) === -1) {
            arrDPNames.push(name)
          }
        })
      }
    })

    const nodes = this._model.getProperty('/nodes')
    this._visitNodes(nodes, (node) => (node.nodeState = NodeState.Normal))
    this._setIncompatibleObjects(nodes, arrDPNames)
  }

  AvailObjects.prototype._setIncompatibleObjects = function (nodes, arrDPNames) {
    nodes.forEach((node) => {
      const kind = node['@qualification']
      if (kind && kind !== 'Measure' && node.nodeType !== NodeType.Variable) {
        let arr = this._getLinkedObjectDpNames(node.id)
        if (arr.length === 0) {
          arr = [node.dataProviderName]
        }

        if (!this._arrayIntersection(arrDPNames, arr)) {
          node.nodeState = NodeState.Incompatible
        }
      }
      if (Array.isArray(node.nodes)) {
        this._setIncompatibleObjects(node.nodes, arrDPNames)
      }
    })
  }

  AvailObjects.prototype._getLinkedObjectDpNames = function (id) {
    let dpNames = []
    const link = this._getLinkedObject(id)
    if (link) {
      dpNames = link.linkedExpressions.linkedExpression.map((linkExpression) => {
        const expression = this.getExpressions().find((expr) => expr.id === linkExpression['@id'])
        return expression ? expression.dataProviderName : ''
      })
    }
    return dpNames
  }

  AvailObjects.prototype._getLinkedObject = function (id) {
    let targetLink = null
    if (Array.isArray(this.getLinks())) {
      targetLink = this.getLinks().find((link) => {
        if (link.id === id) {
          return true
        }
        return link.linkedExpressions.linkedExpression.some((linkExpression) => id === linkExpression['@id'])
      })
    }

    return targetLink
  }

  // Code taken from ajaxResultObjects.js
  AvailObjects.prototype._arrayIntersection = function (arr1, arr2) {
    let ret = true
    for (let i = 0; i < arr1.length; i++) {
      if (arr2.indexOf(arr1[i]) < 0) {
        ret = false
        break
      }
    }
    return ret
  }

  AvailObjects.prototype._visitNodes = function (nodes, callback) {
    nodes.forEach((node) => {
      callback(node)
      if (Array.isArray(node.nodes)) {
        this._visitNodes(node.nodes, callback)
      }
    })
  }

  return AvailObjects
})
