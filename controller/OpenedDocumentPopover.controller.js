/* eslint-disable prefer-object-spread, max-len, capitalized-comments */
sap.ui.define([
  'sap/ui/core/mvc/Controller'
], function ( // eslint-disable-line
  Controller
) {
  'use strict'

  const OpenedDocument = Controller.extend('sap.bi.wrc.controller.OpenedDocument', {
    formatter: {
      getDocumentTooltip: (document) => `${document.name}\n${document.report}`
    }
  })

  //
  // LIFE CYCLE
  //

  OpenedDocument.prototype.onInit = function () {
    this._initParams = null
    this._model = new sap.ui.model.json.JSONModel()
    this.getView().setModel(this._model)

    // Bricolages
    this._endButton = this._getDialog().getEndButton()
    this._getDialog().oPopup.setModal(false)

    this._buildModel()

    setTimeout(() => this._anchor(this._initParams.source), 0)
  }

  OpenedDocument.prototype.onExit = function () {
    delete this._endButton
    delete this._initParams
  }

  OpenedDocument.prototype.onAfterRendering = function () {
    debugger
    if (!this._positionned) {
      this._positionned = true
    }
  }
  //
  // PUBLIC API
  //

  OpenedDocument.prototype.initialize = function (initParams) {
    this._initParams = initParams
  }

  //
  // VIEW CALLBACKS
  //

  OpenedDocument.prototype.onCloseDocument = function (oEvent) {
    const index = this._getListItemIndex(oEvent.getSource())
    const documents = this._getDocuments().slice()
    documents.splice(index, 1)
    this._model.setProperty('/documents', documents)
  }

  OpenedDocument.prototype.onShowDocument = function (oEvent) {
    const index = this._getListItemIndex(oEvent.getSource())
    this._setActiveIndex(index, true)
  }

  OpenedDocument.prototype.onMinimize = function () {
    const visible = !this._model.getProperty('/visible')
    this._model.setProperty('/visible', visible)
    const dialog = this._getDialog()
    dialog.setEndButton(visible ? this._endButton : null)
  }

  OpenedDocument.prototype.onClose = function () {
    this.callback()
  }

  //
  // INTERNALS
  //

  OpenedDocument.prototype._buildModel = function () {
    const model = { visible: true }
    model.documents = [
      {
        name: 'Island Report Marketing',
        report: 'Main Report',
        docId: 123
      },
      {
        name: 'Sales Analyzing',
        report: 'Year 2020',
        docId: 1233
      },
      {
        name: 'Drill the Cazba',
        report: 'Babel Oued',
        docId: 555
      },
      {
        name: 'Pump up the volume',
        report: 'Master Sounds',
        docId: 12
      }
    ]

    // for (let i = 0; i < 10 && model.documents.length < 10; i++) {
    //   model.documents.push({
    //     name: 'Pump up the volume',
    //     report: 'Master Sounds',
    //     docId: 100 + i
    //   })
    // }

    this._model.setData(model)

    const activeDocId = 123
    const activeIndex = model.documents.findIndex((document) => document.docId === activeDocId)
    this._setActiveIndex(activeIndex, true)
  }

  OpenedDocument.prototype._setActiveIndex = function (activeIndex, updateSelection) {
    this._getDocuments().forEach((document, index) => {
      document.active = index === activeIndex
      if (updateSelection) {
        document.selected = document.active
      }
    })

    this._model.refresh(true)

    if (activeIndex >= 0) {
      const documents = this.byId('documents')
      if (documents) {
        setTimeout(() => {
          const item = documents.getItems()[activeIndex]
          item.focus()
          item.getDomRef().scrollIntoView({ block: 'center' })
        }, 0)
      }
    }
  }

  OpenedDocument.prototype._getDialog = function () {
    return this.byId('dialog')
  }

  OpenedDocument.prototype._getDocuments = function () {
    return this._model.getProperty('/documents')
  }

  OpenedDocument.prototype._getListItemIndex = function (component) {
    const listItem = jQuery(component.getDomRef().closest('li')).control()[0]
    const index = listItem.getList().indexOfItem(listItem)
    return index
  }

  OpenedDocument.prototype._anchor = function (uiComponent) {
    const anchor = uiComponent.$()
    const width = this._getDialog().$().outerWidth()
    const offset = anchor.offset()

    const x = Math.floor(offset.left - (width + anchor.outerWidth()) / 2)
    const y = Math.floor(offset.top + anchor.outerHeight() + 1)
    this._getDialog().$().css('top', `${y}px`).css('left', `${Math.max(0, x)}px`)
  }

  return OpenedDocument
})
