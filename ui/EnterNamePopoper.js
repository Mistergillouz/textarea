sap.ui.define([
   'sap/m/Popover',
   'sap/m/Page',
   'sap/m/VBox',
   'sap/m/Input',
   'sap/m/Label',
   'sap/m/Toolbar',
   'sap/m/ToolbarSpacer',
   'sap/m/Button'
],
function (Popover, Page, VBox, Input, Label, Toolbar, ToolbarSpacer, Button) {
   "use strict";

   class EnterNamePopover {

      constructor(controller, args) {

         if (this.popover) {
            this.destroy()
         }

         this.fnCallback = args.cb || $.noop
         this.popover = this.createUI(args)
         controller.getView().addDependent(this.popover)
      }

      show(source) {
         this.popover.openBy(source)
      }

      onClose(result) {
         this.destroy()
         this.fnCallback(result)
      }

      destroy() {
         this.popover.close()
         this.popover.destroy()
         this.popover = null
      }
      
      createUI(args) {
         const popover = new Popover({
            placement: 'Bottom',
            showHeader: true,
            contentWidth: '30rem',
            contentHeight: '8rem',
            initialFocus: 'input',
            title: args.title || '',
            content: this.createPopoverContent(args)
         })

         popover.addStyleClass('wingTestEnterNamePopover sapUiSizeCompact')
         popover.attachAfterClose(() => this.onClose(false))
         return popover
      }

      createPopoverContent(args) {         
         const buttonOk = new Button({
            type: 'Accept',
            text: args.buttonText || '',
            enabled: this.validate(args.value)
         }) 

         buttonOk.addStyleClass('wingTestEnterNameOk')
         buttonOk.attachPress(() => this.onClose(true))

         const buttonCancel = new Button({ text: '** Cancel **'})
         buttonCancel.addStyleClass('wingTestEnterNameCancel')
         buttonCancel.attachPress(() => this.onClose(false))

         const label = new Label({
            text: args.text || '',
            labelFor: 'input'
         }) 

         const input = new Input({
            id: 'input',
            type: 'Text',
            value: args.value || ''
         })

         input.addStyleClass('wingTestNewFolderInput')
         input.attachLiveChange((oEvent) => buttonOk.setEnabled(this.validate(oEvent.getParameter('value'))))
            
         const content = new VBox({
            height: '100%',
            items: [label, input]
         })

         content.addStyleClass('sapUiSmallMargin')
         
         const footer = new Toolbar({
            content: [
               new ToolbarSpacer(),
               buttonOk,
               buttonCancel
            ]
         })

         const page = new Page({
            showHeader: false,
            enableScrolling: false,
            content,
            footer
         })

         return page
      }

      validate(value) {
         return Boolean(value)
      }

      get popover () {
         return EnterNamePopover.popover
      }

      set popover (popover) {
         EnterNamePopover.popover = popover
      }
   }

   EnterNamePopover.popover = null

   return EnterNamePopover
})
