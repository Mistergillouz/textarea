sap.ui.define([
  'sap/ui/core/TooltipBase',
  'sap/ui/core/library',
  'sap/ui/core/Control',
  'sap/ui/core/theming/Parameters',
  'sap/ui/core/library'
], function (TooltipBase, sapUiCore, Control, ThemingParameters, sapCoreLib) {
  const RichTooltip = TooltipBase.extend('sap.bi.webi.ui.control.RichTooltip', {
    metadata: {
      properties: {
        'maxWidth': {
          type: sapUiCore.CSSSize.getName(),
          group: 'Dimension',
          defaultValue: '20rem'
        },
        'height': {
          type: sapUiCore.CSSSize.getName(),
          group: 'Dimension',
          defaultValue: 'auto'
        },
        'width': {
          type: sapUiCore.CSSSize.getName(),
          group: 'Dimension',
          defaultValue: 'auto'
        }
      },
      defaultAggregation: 'content',
      aggregations: {
        'content': {
          type: Control.getMetadata().getName(),
          multiple: false,
          bindable: true
        }
      },
      renderer: (oRm, self) => this._render(oRm, self)
    }
  })

  RichTooltip.prototype.init = function () {
    TooltipBase.prototype.init.apply(this, arguments)
  }

  RichTooltip.prototype.setContent = function (control) {
    this.setAggregation('content', control, true)
  }

  RichTooltip.prototype.destroyContent = function () {
    this.destroyAggregation('content', true)
  }

  return RichTooltip
})
