/* global sap */
sap.ui.define([
  'sap/ui/core/Control',
  'sap/ui/model/Filter'
], function ( // eslint-disable-line
  Control,
  Filter
) {
  'use strict'

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
    this._mapPages = {}
    this._i18nModel = new sap.ui.model.resource.ResourceModel({
      bundleUrl: 'data/i18n_dev.properties'
    })

    this._model = new sap.ui.model.json.JSONModel({
      nodes: []
    })

    this._model.setDefaultBindingMode(sap.ui.model.BindingMode.TwoWay)
    this._createUI()

    const nodes = this._processNodes([
      { text: 'Row0' },
      {
        text: 'Row1',
        nodes: [{ text: 'coucou' }]
      },
      {
        text: 'Row2',
        nodes: [
          { text: 'Row2/1' },
          { text: 'Row2/2' }
        ]
      }
    ])

    this._model.setProperty('/nodes', nodes)
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

  AvailObjects.prototype._createUI = function () {
    this._tree = new sap.m.Tree()

    this._tree.attachBrowserEvent('contextmenu', (oEvent) => this._onContextMenu(oEvent))
    this._tree.attachToggleOpenState(() => this._tree.rerender())

    this._tree.setModel(this._model)
    const item = new sap.m.StandardTreeItem({
      title: '{text}'
    })

    const customData = new sap.ui.core.CustomData({
      key: 'selectable',
      value: '{selectable}',
      writeToDom: true
    })

    item.addCustomData(customData)

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

    this._mainPage = new sap.m.Page({
      showHeader: true,
      customHeader: header,
      showFooter: false,
      content: new sap.m.ScrollContainer({
        height: '100%',
        vertical: true,
        content: this._tree
      })
    })

    this.setMultiSelection(this.getMultiSelection())
    this.setAllowSearch(this.getAllowSearch())
  }

  /****************
  // FORMATTERS
  *****************/

  /********************
  // UTILITY FUNCTIONS
  *********************/

  AvailObjects.prototype._processNodes = function (inNodes, depth = 0) {
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
