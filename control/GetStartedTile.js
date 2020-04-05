/* eslint-disable object-property-newline, max-statements, no-loop-func, no-multi-assign, no-magic-numbers, max-len */
sap.ui.define([
  'sap/ui/core/Control',
  'sap/ui/events/PseudoEvents'
], function (Super, PseudoEvents) {
  'use strict'

  const Tile = Super.extend('sap.bi.wrc.control.GetStartedTile', {
    metadata: {
      properties: {
        width: { type: 'sap.ui.core.CSSSize', defaultValue: '10rem' },
        height: { type: 'sap.ui.core.CSSSize', defaultValue: '10rem' },
        title: { type: 'string', defaultValue: null },
        subTitle: { type: 'string', defaultValue: null },
        icon: { type: 'sap.ui.core.URI', defaultValue: null },
        selected: { type: 'boolean', defaultValue: false}
      },
      events: {
        press: {}
      },

      dnd: { droppable: false, draggable: true }
    },
    renderer: (oRm, self) => self._render(oRm)
  })

  Tile.prototype.init = function () {
    Super.prototype.init.apply(this, arguments)
    this._title = new sap.m.Text({ maxLines: 2 }).addStyleClass('sapWrcGetStartedTitle')
    this._subTitle = new sap.m.Text({ maxLines: 4 }).addStyleClass('sapWrcGetStartedSubTitle')
    this._icon = new sap.ui.core.Icon({ size: '2.5rem', useIconTooltip: false }).addStyleClass('sapWrcGetStartedIcon')
  }

  Tile.prototype.destroy = function () {
    Super.prototype.destroy.apply(this, arguments)
    this._title.destroy()
    this._subTitle.destroy()
    this._icon.destroy()
  }

  Tile.prototype.onAfterRendering = function () {
    Super.prototype.onAfterRendering.apply(this, arguments)
    const rtl = sap.ui.getCore().getConfiguration().getRTL()
    if (rtl) {
      this._icon.$().css('right', '.75rem')
    } else {
      this._icon.$().css('left', '.75rem')
    }
  }

  Tile.prototype.ontap = function (event) {
    this.firePress()
    event.preventDefault()
  }

  Tile.prototype.onkeyup = function (event) {
    if (PseudoEvents.events.sapselect.fnCheck(event)) {
      this.firePress()
    }
    event.preventDefault()
  }


  Tile.prototype._render = function (out) {
    if (!this.getVisible()) {
      return
    }

    const tooltipText = this._getTooltipText()
    out.write(`<div tabindex="0" role="button" aria-label="${tooltipText}"`)

    if (this.getSelected()) {
      out.writeAttribute('aria-selected', true)
    }

    out.addStyle('width', this.getWidth())
    out.addStyle('height', this.getHeight())
    out.writeStyles()

    out.addClass('sapUiSizeCompact sapWrcGetStartedTile sapMGT sapMGTScopeActions sapMPointer')
    out.writeClasses(this)
    out.writeControlData(this)
    out.write('>')

    const title = this.getTitle()
    if (title) {
      this._title.setText(title)
      out.renderControl(this._title)
    }

    const subTitle = this.getSubTitle()
    if (subTitle) {
      this._subTitle.setText(subTitle)
      out.renderControl(this._subTitle)
    }

    const icon = this.getIcon()
    if (icon) {
      this._icon.setSrc(icon)
      out.renderControl(this._icon)
    }

    if (this.getSelected()) {
      out.write('<div class="sapWrcGetStartedTileSelection"/>')
    }

    out.write('</div>')
  }

  Tile.prototype._getTooltipText = function () {
    const tooltipText = this.getSubTitle() || this.getTitle()
    return tooltipText
  }

  Tile.prototype._updateAriaAndTitle = function () {
    const tooltipText = this._getTooltipText()
    this.$().attr('title', tooltipText)
  }

  Tile.prototype._removeTooltipFromControl = function () {
    this.$().removeAttr('title')
  }

  return Tile
})
