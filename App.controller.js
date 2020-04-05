sap.ui.define([
  "sap/ui/core/mvc/Controller",
  'sap/bi/wrc/control/Tetris'

], function (Controller, Tetris) {
  "use strict";

  const C = Controller.extend('gs.App', {})

  C.prototype.onInit = function () {
    $.getJSON('data/data.json', (data) => {
      console.log(data)
      this._model.setData(data, true)
    })

    this._model = new sap.ui.model.json.JSONModel({
      visibleTileIcon: true,
      select: [{ id: '1', text: 'Ligne1'}, { id: '2', text: 'Ligne2' }]
    })
    this._model.setDefaultBindingMode(sap.ui.model.BindingMode.TwoWay)
    this.getView().setModel(this._model)
  }

  C.prototype.onAfterRendering = function () {
  }

  C.prototype.onTetris = function () {
    const args = {
      callback: (result) => console.log('tetris', result)
    }

    this._tetris = new Tetris(args)
  }

  C.prototype.onDS = function (oEvent) {
    const ID = 'opened'
    const view = sap.ui.xmlview(ID, 'sap.bi.webi.view.OpenedDocumentPopover')

    this.getView().addDependent(view)
    const dialog = view.byId('dialog')

    dialog.setVisible(true)
    dialog.open()

    const params = {
      source: oEvent.getSource(),
      callback: $.noop
    }

    view.getController().initialize(params)
  }

  C.prototype.onDragStart = function (oEvent) {
    console.log('onDragStart')
  }

  C.prototype.onDragEnter = function (oEvent) {
    console.log('onDragEnter')
  }

  C.prototype.onToast = function () {
    sap.m.MessageToast.show("Lorem ipsum dolor sit amet\nConsectetur adipiscing elit\n\nsed do eiusmod tempor incididunt ut labore et dolore magna aliqua. Ut enim ad minim veniam, quis nostrud exercitation ullamco laboris nisi ut aliquip ex ea commodo consequat. Duis aute irure dolor in reprehenderit in voluptate velit esse cillum dolore eu fugiat nulla pariatur. Excepteur sint occaecat cupidatat non proident, sunt in culpa qui officia deserunt mollit anim id est laborum", {
      width: "75%",                   // default
      duration: 1000000,
      autoClose: false
    });
  }

  C.prototype.onShowDateTimePicker = function (oEvent) {
    const dateTimePicker = new sap.m.DateTimePicker({
      change: (oEvent) => {

        debugger
      }
    })

    dateTimePicker._openPopup = () => dateTimePicker._oPopup.openBy(oEvent.getSource())
    dateTimePicker.toggleOpen()
  }

  C.prototype.onChange = function (oEvent) {
    console.log('+ change')
  }

  C.prototype.onOk = function (oEvent) {
    const dt = this.byId('DP1')

    const date = dt.getDateValue()
    console.log('++ onOK', date)
  }

  C.prototype._enumFunctions = function (object) {
    const keys = Object.keys(object.__proto__)
    keys.forEach((key) => {
      const funct = object[key]
      console.log(key, typeof funct === 'function')
    })
  }
})
