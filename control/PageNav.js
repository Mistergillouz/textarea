
// Import / Require: dependances sur Control et CSSGrid
sap.ui.define(['sap/ui/core/Control', 'sap/ui/layout/cssgrid/CSSGrid'], function (Control, CSSGrid) { // eslint-disable-line

  'use strict'

  // Creation de l'instance: on derive de Control (le composant de base de sapui)
  const PageNav = Control.extend('sap.bi.wrc.control.PageNav', {
    metadata: {

      // Definition des properties du custom (equivalent aux props de React)
      properties: {
        currentPage: { type: 'int', defaultValue: 1 },
        maxPage: { type: 'int', defaultValue: -1 }
      },

      // Declararation de l'event
      events: {
        pageChanged: {}
      }
    },

    // Rendering
    renderer: (out, self) => self._render(out)
  })

  //
  // CONTROL LIFE CYCLE
  //

  PageNav.prototype.init = function () {
    const pageLabel = new sap.m.Text({ text: 'Page:' })

    this.firstPageButton = new sap.m.Button({
      icon: 'sap-icon://media-rewind',
      enabled: false,
      press: () => this.onPageRequested('first')
    })

    this.prevPageButton = new sap.m.Button({
      icon: 'sap-icon://navigation-left-arrow',
      enabled: false,
      press: () => this.onPageRequested('prev')
    })

    this.pageInput = new sap.m.Input({
      value: null,
      width: 'auto',
      type: 'Number',
      enabled: false,
      placeholder: 'Enter page number',
      valueLiveUpdate: true,
      valueState: sap.ui.core.ValueState.None,
      valueStateText: 'Invalid page number',
      liveChange: (oEvent) => this.onPageNumberChanged(oEvent),
      submit: (oEvent) => this.onPageNumberRequest(oEvent)
    })

    this.nextPageButton = new sap.m.Button({
      icon: 'sap-icon://navigation-right-arrow',
      enabled: false,
      press: () => this.onPageRequested('next')
    })

    this.lastPageButton = new sap.m.Button({
      icon: 'sap-icon://media-forward',
      enabled: false,
      press: () => this.onPageRequested('last')
    })

    const items = [
      pageLabel,
      this.firstPageButton,
      this.prevPageButton,
      this.pageInput,
      this.nextPageButton,
      this.lastPageButton
    ]

    this.grid = new CSSGrid({
      width: 'auto',
      gridTemplateColumns: 'max-content repeat(2, 2rem) 10rem repeat(2, 2rem)',
			gridTemplateRows: '2.5rem',
      gridGap: '0.25rem',
      alignItems: 'Center',
      items
    })

    this._update()
  }

  PageNav.prototype.exit = function () {
    this.grid.destroy()
  }

  PageNav.prototype.onAfterRendering = function () {
  }

  PageNav.prototype._render = function (out) {
    if (!this.getVisible()) {
      return
    }

    const tooltipText = this._getTooltipText()
    let header = `<div tabindex="0" role="navigation" aria-label="${tooltipText}"`
    out.write(header)
    out.writeStyles()

    out.addClass('sapUiSizeCompact sacrPageToolbar')
    out.writeClasses(this)
    out.writeControlData(this)
    out.write('>')

    out.renderControl(this.grid)

    out.write('</div>')
  }

  //
  // CONTROL CALLBACKS
  //

  PageNav.prototype.onPageNumberChanged = function (oEvent) {
    const page = oEvent.getSource().getValue()

    let invalidPage = false
    if (page.length) {
      invalidPage = this._isPageNumberInvalid(page)
    }

    this.pageInput.setValueState(invalidPage ? sap.ui.core.ValueState.Warning : sap.ui.core.ValueState.None)
  }

  PageNav.prototype.onPageNumberRequest = function (oEvent) {
    const page = Number(oEvent.getParameter('value'))
    if (page) {
      this.firePageChanged({ page })
    }
  }

  PageNav.prototype.onPageRequested = function (page) {
    this.firePageChanged({ page })
  }

  //
  // CONTROL PROPERTIES OVERRIDES
  //

  PageNav.prototype.setCurrentPage = function (page) {
    this.setProperty('currentPage', page)
    this._update()
  }

  PageNav.prototype.setMaxPage = function (page) {
    this.setProperty('maxPage', page)
    this._update()
  }

  //
  // INTERNAL
  //

  PageNav.prototype._update = function () {
    const currentPage = this.getCurrentPage()
    const maxPage = this.getMaxPage()

    const prevPage = currentPage > 1
    const nextPage = maxPage === -1 || currentPage < maxPage
    const gotoPage = maxPage !== 1

    this.prevPageButton.setEnabled(prevPage)
    this.firstPageButton.setEnabled(prevPage)

    this.nextPageButton.setEnabled(nextPage)
    this.lastPageButton.setEnabled(nextPage)

    this.pageInput.setEnabled(gotoPage)
  }

  PageNav.prototype._isPageNumberInvalid = function (page) {
    const maxPages = this.getMaxPage()
    const invalidPage = isNaN(page) || page < 1 || (maxPages !== -1 && page > maxPages)
    return invalidPage
  }

  PageNav.prototype._getTooltipText = function () {
    let tooltipText = 'Hello there'
    return tooltipText
  }

  return PageNav
})
