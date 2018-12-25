/* global sap */
sap.ui.define([
  'sap/ui/core/Control'
], function ( // eslint-disable-line
  Control
) {
  'use strict'

  const VALUES_ROOT = '/values'
  const VALUES_SEARCH = '/search'
  const VALUES_NODES = 'nodes'

  const SearchMode = {
    NONE: 'None',
    LOCAL: 'Local',
    CLIENT: 'Client'
  }

  const LOV = Control.extend('sap.bi.webi.ui.control.LOV', {
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
        multi: {
          type: 'boolean',
          defaultValue: false
        },
        dataType: {
          type: 'string',
          defaultValue: 'String'
        },
        searchMode: {
          type: 'string',
          defaultValue: SearchMode.LOCAL
        },
        values: {
          type: 'array',
          defaultValue: []
        },
        answerValues: {
          type: 'array',
          defaultValue: []
        },
        defaultValues: {
          type: 'array',
          defaultValue: []
        },
        showKeys: {
          type: 'boolean',
          defaultValue: false
        }
      },
      aggregations: {
        footer: {
          type: 'sap.m.IBar',
          multiple: false
        }
      },
      events: {
        fetchValues: {},
        selectionChange: {}
      }
    },
    renderer: (out, self) => self._render(out)
  })

  LOV.prototype.init = function () {
    this._mapPages = {}
    this._i18nModel = new sap.ui.model.resource.ResourceModel({
      bundleUrl: 'data/i18n_dev.properties'
    })

    this._model = new sap.ui.model.json.JSONModel({
      answerCount: 0,
      showKeys: false,
      searchMode: SearchMode.LOCAL,
      multi: false,
      hierarchical: false,
      values: [],
      answerValues: [],
      defaultValues: [],
      okEnabled: false
    })

    this._model.setDefaultBindingMode(sap.ui.model.BindingMode.TwoWay)

    this._mainNav = new sap.m.NavContainer()

    this._valuePage = this._buildValuePage()
    this._answerPage = this._buildAnswerPage()
    this._mainNav.addPage(this._valuePage)
    this._mainNav.addPage(this._answerPage)

    this._mainPage = new sap.m.Page({
      showHeader: false,
      showSubHeader: false,
      content: this._mainNav,
      footer: this._getDefaultFooterToolbar()
    })

    this._updateEnablement()
  }

  LOV.prototype.setFooter = function (toolbar) {
    const content = toolbar.getContent()
    const controls = this._getDefaultFooterToolbarControls()
    content.splice(0, 0, ...controls)
    toolbar.removeAllContent()
    content.forEach((control) => toolbar.addContent(control))

    this._mainPage.setFooter(toolbar)
  }

  LOV.prototype._render = function (out) {
    out.write('<div')
    out.writeControlData(this)
    this.addStyleClass('sapWingReportLov')
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

  LOV.prototype.setValues = function (inValues) {
    const values = Array.isArray(inValues) ? inValues : []
    this.setProperty('values', values)

    this._removeAllValuePages()
    this._model.setProperty(VALUES_ROOT, this._prepareValues(values))

    const hierarchical = this._visitValues((value) => {
      if (value.isWithChildren || Array.isArray(value[VALUES_NODES])) {
        return true
      }
    })

    this._model.setProperty('/hierarchical', hierarchical)
    this._addValuePage(VALUES_ROOT)
  }

  LOV.prototype.setDefaultValues = function (inValues) {
    const values = Array.isArray(inValues) ? inValues : []
    this.setProperty('defaultValues', values)
    this._model.setProperty('/defaultValues', values)
  }

  LOV.prototype.setAnswerValues = function (inValues) {
    const values = Array.isArray(inValues) ? inValues : []
    this.setProperty('answerValues', values)
    this._model.setProperty('/answerValues', values)
    this._model.setProperty('/answerCount', values.length)
  }

  LOV.prototype.setSearchMode = function (searchMode) {
    const values = Object.values(SearchMode)
    if (values.indexOf(searchMode) === -1) {
      throw Error(`Invalid SearchMode: "${searchMode}". Valid SearchModes are: ${values.join(', ')}`)
    }
    this.setProperty('searchMode', searchMode)
    this._model.setProperty('/searchMode', searchMode)
  }

  LOV.prototype.setShowKeys = function (value) {
    this.setProperty('showKeys', value)
    this._model.setProperty('/showKeys', value)
  }

  /***********************
  // EVENT HANDLERS
  ************************/

  LOV.prototype._onSearchLiveChange = function (oEvent) {
    if (this.getSearchMode() === SearchMode.LOCAL) {
      this._searchLocal(oEvent.getParameter('newValue'))
    }
  }
  LOV.prototype._onSearch = function (oEvent) {
    if (oEvent.getParameter('clearButtonPressed')) {
      this._searchLocal(null)
    } else {
      const searchMode = this.getSearchMode()
      switch (searchMode) {
        // TODO
        case SearchMode.CLIENT:
          break

        case SearchMode.LOCAL:
          this._searchLocal(oEvent.getParameter('query'))
          break
      }
    }
  }

  LOV.prototype._onReset = function () {
    this.getAnswerValues().forEach((selectedValue) => this._selectValue(selectedValue, false))
    const defaultValues = this.getDefaultValues().slice()
    this.setAnswerValues(defaultValues)
    defaultValues.forEach((value) => this._selectValue(value, true))
    this.fireSelectionChange()
  }

  LOV.prototype._onValuesItemItemPressed = function (oEvent) {
    const listItem = oEvent.getParameter('listItem')
    if (listItem.getType() === sap.m.ListType.Navigation) {
      const valueContext = oEvent.getParameter('listItem').getBindingContext()
      const selectedValue = valueContext.getObject()
      const modelPath = `${valueContext.getPath()}/${VALUES_NODES}`
      if (this._mapPages[modelPath]) {
        this._navigateToValuePage(modelPath)
      } else if (Array.isArray(selectedValue[VALUES_NODES])) {
        this._addValuePage(modelPath)
      } else {
        this.fireFetchValues({
          path: valueContext.getPath(),
          done: (inValues) => {
            const values = this._prepareValues(inValues)
            this._model.setProperty(modelPath, values)
            this._addValuePage(modelPath)
          }
        })
      }
    }
  }

  LOV.prototype._onValuesItemSelectionChange = function (oEvent) {
    const selected = oEvent.getParameter('selected')
    const selectedValue = oEvent.getParameter('listItem').getBindingContext().getObject()
    const answerValues = this.getAnswerValues().slice()
    const index = answerValues.findIndex((answerValue) => this._isValueEqual(answerValue, selectedValue))
    if (selected) {
      if (!this.getMulti()) {
        answerValues.forEach((value) => this._selectValue(value, false))
        answerValues.length = 0
      }
      if (index === -1) {
        answerValues.push(this._toValue(selectedValue))
        this._selectValue(selectedValue, true)
      }
    } else if (index !== -1) {
      this._selectValue(selectedValue, false)
      answerValues.splice(index, 1)
    }

    this.setAnswerValues(answerValues)
    this.fireSelectionChange()
  }

  LOV.prototype._onShowSelected = function () {
    const page = this._mainNav.getCurrentPage() === this._answerPage ? this._valuePage : this._answerPage
    this._mainNav.to(page)
  }

  LOV.prototype._onDeleteAnswer = function (oEvent) {
    const value = oEvent.getParameter('listItem').getBindingContext().getObject()
    const answerValues = this.getAnswerValues()
    const index = answerValues.findIndex((answerValue) => answerValue === value)
    if (index !== -1) {
      this._selectValue(answerValues[index], false)
      const newAnswers = answerValues.slice()
      newAnswers.splice(index, 1)
      this.setAnswerValues(newAnswers)
      this.fireSelectionChange()
    }
  }

  /// ////////////////////
  // INTERNAL FUNCTIONS

  LOV.prototype._searchLocal = function (inQuery) {
    const query = inQuery && inQuery.trim()
    if (query && query.length) {
      const values = []
      this._visitValues((value, modelPath) => {
        if (this._getCaption(value).indexOf(query) !== -1) {
          values.push(value)
        }
      })
      this._setSearchResult(values)
    } else {
      this._valueNav.back()
    }
  }

  LOV.prototype._setSearchResult = function (values) {
    this._model.setProperty(VALUES_SEARCH, values)
    const searchPage = this._mapPages[VALUES_SEARCH]
    const transition = 'flip'
    if (!searchPage) {
      this._addValuePage(VALUES_SEARCH, { transition })
    } else {
      searchPage.rerender()
      if (this._valueNav.getCurrentPage() !== searchPage) {
        this._valueNav.to(searchPage, transition)
      }
    }
  }

  LOV.prototype._selectValue = function (selectedValue, selected) {
    this._visitValues((value, modelPath) => {
      if (this._isValueEqual(value, selectedValue)) {
        this._model.setProperty(`${modelPath}/selected`, selected)
      }
    })
  }

  LOV.prototype._navigateToValuePage = function (path) {
    const page = this._mapPages[path]
    this._valueNav.to(page)
  }

  LOV.prototype._addValuePage = function (bindingPath, inArgs) {
    const args = inArgs || {}
    const table = new sap.m.Table({
      growing: true,
      growingScrollToLoad: true,
      mode: this.getMulti() ? sap.m.ListMode.MultiSelect : sap.m.ListMode.SingleSelectLeft,
      selectionChange: (oEvent) => this._onValuesItemSelectionChange(oEvent),
      itemPress: (oEvent) => this._onValuesItemItemPressed(oEvent)
    })

    const answerColumn = new sap.m.Column()
    const keyColumn = new sap.m.Column()

    // this._attachProperty(answerColumn, 'visible', '/showKeys')
    this._attachProperty(keyColumn, 'visible', '/showKeys')

    table.addColumn(answerColumn)
    table.addColumn(keyColumn)

    const textCell = new sap.m.Text({ maxLines: 3 })
    this._attachProperty(textCell, 'text', '', (answer) => this._formatValue(answer))

    const keyCell = new sap.m.Text({ maxLines: 1 })
    this._attachProperty(keyCell, 'text', '', (answer) => this._formatKey(answer))

    const columnListItem = new sap.m.ColumnListItem({
      cells: [
        textCell,
        keyCell
      ]
    })

    this._attachProperty(columnListItem, 'selected', 'selected')
    this._attachProperty(columnListItem, 'type', '', (answer) => this._getListType(answer))

    columnListItem.addStyleClass('wingTestLovRow')

    table.setModel(this._model)
    table.bindAggregation('items', {
      path: bindingPath,
      template: columnListItem
    })

    const bread = this._buildBreadcrumb(bindingPath)
    const page = new sap.m.Page({
      showHeader: false,
      showFooter: false,
      subHeader: bread,
      content: table
    })

    if (bread) {
      setTimeout(() => bread.rerender(), 0)
    }

    this._attachProperty(page, 'showSubHeader', '/hierarchical', (hierarchical) => Boolean(hierarchical && bread))
    page.addStyleClass('wingTestLOVValuePage sapWingLOVValuePage')

    this._mapPages[bindingPath] = page
    this._valueNav.addPage(page)
    this._valueNav.to(page, args.transition)
    return page
  }

  LOV.prototype._buildBreadcrumb = function (modelPath) {
    const indices = modelPath.match(/(\d+)/g)
    if (!indices) {
      return null
    }

    const links = []
    for (let i = 0; i < indices.length - 1; i++) {
      const valuePath = this._toModelPath(indices.slice(0, i + 1))
      const value = this._model.getProperty(valuePath)
      links.push(new sap.m.Link({
        text: this._getCaption(value),
        press: () => this._navigateToValuePage(`${valuePath}/${VALUES_NODES}`)
      }))
    }

    const box = new sap.m.HBox({
      width: '100%',
      alignItems: 'Center'
    })

    box.addItem(new sap.m.Button({
      icon: 'sap-icon://home',
      press: () => this._navigateToValuePage(VALUES_ROOT)
    }))

    const bread = new sap.m.Breadcrumbs({
      currentLocationText: this._getCaption(this._model.getProperty(this._toModelPath(indices))),
      links
    })

    bread.setLayoutData(new sap.m.FlexItemData({ growFactor: 1 }))
    bread.addStyleClass('sapUiNoMargin')
    box.addItem(bread)

    setTimeout(() => bread.invalidate(), 0)

    const toolbar = new sap.m.Toolbar()
    toolbar.addContent(box)
    return toolbar
  }

  LOV.prototype._removeAllValuePages = function () {
    this._mapPages = {}
    this._valueNav.removeAllPages()
  }

  LOV.prototype._updateEnablement = function () {
    const enabled = this.getAnswerValues().length > 0
    this._model.setProperty('/okEnabled', enabled)
  }

  LOV.prototype._buildValuePage = function () {
    this._valueNav = new sap.m.NavContainer()
    const page = new sap.m.Page({
      showHeader: false,
      subHeader: this._getValuePageToolbar(),
      content: this._valueNav
    })

    this._attachProperty(page, 'showSubHeader', '/searchMode', (searchMode) => Boolean(searchMode !== SearchMode.NONE))
    return page
  }

  LOV.prototype._buildAnswerPage = function () {
    const table = this._buildAnswerTable()
    const page = new sap.m.Page({
      id: 'answers',
      showHeader: false,
      content: new sap.m.ScrollContainer({
        height: '100%',
        vertical: true,
        content: table
      })
    })

    return page
  }

  LOV.prototype._buildAnswerTable = function () {
    const textCell = new sap.m.Text()
    this._attachProperty(textCell, 'text', '', (answer) => this._formatValue(answer))
    // this._attachProperty(textCell, 'title', '', (answer) => this._formatValue(answer))

    const keyCell = new sap.m.Text()
    this._attachProperty(keyCell, 'text', '', (answer) => this._formatKey(answer))

    const answerColumn = new sap.m.Column({
      header: new sap.m.Text({ text: this._getLocalizedText('prompts.lovPanel.selectedValuesColumnHeader') })
    })

    const keyColumn = new sap.m.Column({
      header: new sap.m.Text({ text: this._getLocalizedText('prompts.lovPanel.keyColumnHeader') })
    })

    this._attachProperty(keyColumn, 'visible', '/showKeys')

    const table = new sap.m.Table({
      mode: 'Delete',
      noDataText: this._getLocalizedText('prompts.lovPanel.noSelectedValue'),
      delete: (oEvent) => this._onDeleteAnswer(oEvent)
    })

    table.addColumn(answerColumn)
    table.addColumn(keyColumn)

    table.setModel(this._model)
    table.bindAggregation('items', {
      path: '/answerValues',
      template: new sap.m.ColumnListItem({
        cells: [
          textCell,
          keyCell
        ]
      }).addStyleClass('wingTestLovRow')
    })

    return table
  }

  LOV.prototype._getValuePageToolbar = function () {
    const toolbar = new sap.m.Toolbar()
    toolbar.addContent(new sap.m.SearchField({
      width: '100%',
      liveChange: (oEvent) => this._onSearchLiveChange(oEvent),
      search: (oEvent) => this._onSearch(oEvent)
    }))

    return toolbar
  }

  LOV.prototype._getDefaultFooterToolbar = function () {
    const toolbar = new sap.m.Toolbar()
    const controls = this._getDefaultFooterToolbarControls()
    controls.forEach((control) => toolbar.addContent(control))
    return toolbar
  }

  LOV.prototype._getDefaultFooterToolbarControls = function () {
    const toggle = new sap.m.ToggleButton({
      icon: 'sap-icon://complete',
      press: (oEvent) => this._onShowSelected(),
      tooltip: this._getLocalizedText('prompts.lovPanel.answers.tooltip')
    })

    this._attachProperty(toggle, 'text', '/answerCount')

    const spacer = new sap.m.ToolbarSpacer()

    const resetButton = new sap.m.Button({
      text: this._getLocalizedText('prompts.lovPanel.reset'),
      press: () => this._onReset()
    })

    this._attachProperty(resetButton, 'visible', '/defaultValues/length', (value) => Boolean(value))

    return [
      toggle,
      spacer,
      resetButton
    ]
  }

  /****************
  // FORMATTERS
  *****************/

  LOV.prototype._formatKey = function (value) {
    return value && value['@id']
  }

  // TODO
  LOV.prototype._formatValue = function (inValue) {
    let value = this._getCaption(inValue)
    if (value === null) {
      value = this._getKey(inValue)
      // return parameter.formatValue(value.$ || value, this.getDataType(), true, this._getLocale())
    } else if (value.length === 0) {
      value = this._getLocalizedText('prompts.lovPanel.empty.value')
    }
    return value
  }

  LOV.prototype._isSelected = function (value) {
    const found = this.getAnswerValues().some((answerValue) => this._isValueEqual(value, answerValue))
    return found
  }

  LOV.prototype._getListType = function (value) {
    let hasChild = false
    if (value) {
      hasChild = value.isWithChildren || (Array.isArray(value[VALUES_NODES]) && value[VALUES_NODES].length)
    }

    return hasChild ? sap.m.ListType.Navigation : sap.m.ListType.Inactive
  }

  /********************
  // UTILITY FUNCTIONS
  *********************/

  LOV.prototype._isValueEqual = function (value0, value1) {
    return this._getCaption(value0) === this._getCaption(value1) && this._getKey(value0) === this._getKey(value1)
  }

  LOV.prototype._getCaption = function (value) {
    if (typeof value === 'string') {
      return value
    }
    return value && Object.hasOwnProperty.call(value, '$') ? value.$ : null
  }

  LOV.prototype._getKey = function (value) {
    if (value && Object.hasOwnProperty.call(value, '@id')) {
      return value['@id']
    }
    return null
  }

  LOV.prototype._getLocale = function () {
    return null
  }

  LOV.prototype._getLocalizedText = function (id) {
    const text = this._i18nModel.getResourceBundle().getText(id)
    return text
  }

  LOV.prototype._attachProperty = function (component, property, value, callback) {
    component.setModel(this._model)
    component.bindProperty(property, value, callback)
  }

  LOV.prototype._visitValues = function (callback) {
    const path = []
    const values = this._model.getProperty(VALUES_ROOT)
    return this._visit(values, path, callback)
  }

  LOV.prototype._visit = function (values, path, callback) {
    return values.some((value, index) => {
      path.push(index)
      if (callback(value, this._toModelPath(path)) === true) {
        return true
      }

      let result = false
      if (Array.isArray(value[VALUES_NODES])) {
        result = this._visit(value[VALUES_NODES], path, callback)
      }
      path.pop()
      return result
    })
  }

  LOV.prototype._prepareValues = function (inValues) {
    const values = inValues.map((value) => {
      const newValue = typeof value === 'string' ? { $: value } : value
      newValue.selected = this._isSelected(newValue)
      if (Array.isArray(newValue[VALUES_NODES])) {
        newValue[VALUES_NODES] = this._prepareValues(newValue[VALUES_NODES])
      }

      return newValue
    })

    return values
  }

  LOV.prototype._toModelPath = function (indices) {
    let modelPath = null
    if (Array.isArray(indices) && indices.length) {
      modelPath = `${VALUES_ROOT}/${indices[0]}`
      indices.slice(1).forEach((pathIndex) => modelPath += `/${VALUES_NODES}/${pathIndex}`) // eslint-disable-line
    }

    return modelPath
  }

  LOV.prototype._toValue = function (value) {
    const result = {}
    if (Object.hasOwnProperty.call(value, '$')) {
      result.$ = value.$
    }
    if (Object.hasOwnProperty.call(value, '@id')) {
      result['@id'] = value['@id']
    }

    return result
  }

  return LOV
})
