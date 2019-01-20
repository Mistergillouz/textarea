sap.ui.define([
  'sap/ui/core/theming/Parameters',
  'sap/ui/core/library'
], function (ThemingParameters, sapCoreLib) {

  const backgroundColor = ThemingParameters.get('sapUiGroupContentBackground')
  const OpenState = sapCoreLib.OpenState

  return {
    render: function (renderManager, control) {
      if (control._getPopup().getOpenState() === OpenState.OPENING) {
        const contents = control.getAggregation('content')
        renderManager.write('<div')
          .writeControlData(control)
          .addClass('sapWiseRichTooltip')
          .writeClasses()
          .addStyle('max-width', control.getMaxWidth())
          .addStyle('height', control.getHeight())
          .addStyle('width', control.getWidth())
          .addStyle('background-color', backgroundColor)
          .writeStyles()
          .write('>')
          .renderControl(contents)
          .write('</div>')
      }
    }
  }
}, true)