/* eslint-disable max-statements, object-property-newline */

sap.ui.define(['sap/ui/core/Control'], function (Control) {
  'use strict'

  const TileIcon = Control.extend('sap.bi.wrc.control.TileIcon', {
    metadata: {
      properties: {
        icon: { type: 'sap.ui.core.URI', defaultValue: null },
        text: { type: 'string', defaultValue: null },
        additionalText: { type: 'string', defaultValue: null },
        visible: { type: 'boolean', defaultValue: true }
      }
    },
    renderer: (out, self) => self._render(out)
  })

  TileIcon.prototype.init = function () {
    this.icon = new sap.ui.core.Icon({ size: '0.8rem' })
    this.icon.addStyleClass('sapUiTinyMarginEnd')
    this.text = new sap.m.Text({ maxLines: 1 })
    this.text.addStyleClass('sapWingTileIconText sapMGTSubHdrTxt')
  }

  TileIcon.prototype.exit = function () {
    this.icon.destroy()
    this.text.destroy()
  }

  TileIcon.prototype._render = function (out) {
    if (this.getVisible()) {
      const icon = this.getIcon() || null
      this.icon.setSrc(icon)
      this.text.setText(this.getText())

      out.renderControl(this.icon)
      out.renderControl(this.text)

      const additionalText = this.getAdditionalText()
      if (additionalText) {
        out.write('<span/>')
        this.text.setText(additionalText)
        out.renderControl(this.text)
      }
    }
  }

  return TileIcon
})
