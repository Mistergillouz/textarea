/* eslint-disable no-loop-func */
/* eslint-disable object-property-newline */
sap.ui.define(['sap/ui/core/Control'], function (Super) {
  'use strict'

  const FOCUSED_CLASS = 'sapWingTileFocused'
  const TileBox = Super.extend('sap.bi.wrc.control.TileBox', {
    metadata: {
      properties: {
        title: { type: 'string', defaultValue: null },
        ariaLabel: { type: 'string', defaultValue: 'Hey there' },
        icon: { type : "sap.ui.core.URI", defaultValue : null },
        showHeader: { type: 'boolean', defaultValue: true }
      },

      dnd: { droppable: true, draggable: false },

      defaultAggregation: 'items',
      aggregations: {
        items: { type : "sap.ui.core.Control", multiple: true, singularName: 'items' },
        header: { type : "sap.ui.core.Control", multiple: true, singularName: 'header' }
      },
    },
    renderer: (out, self) => self._render(out)
  })

  TileBox.prototype.init = function () {
    Super.prototype.init.call(this)
  }

  TileBox.prototype.destroy = function () {
    Super.prototype.destroy.apply(this, arguments)
    if (this._icon) {
      this._icon.destroy()
      delete this._icon
    }

    if (this._title) {
      this._title.destroy()
      delete this._title
    }
  }

  TileBox.prototype._render = function (out) {
    if (!this.getVisible()) {
      return
    }

    out.write('<div')
    out.writeStyles()

    out.addClass('sapWrcTileBox')
    out.writeClasses(this)
    out.writeControlData(this)

    out.writeAttribute('tabindex', 0)

    const ariaLabel = this.getAriaLabel()
    if (ariaLabel) {
      out.writeAttribute('aria-label', ariaLabel)
    }

    out.write('>')

    if (this.getShowHeader()) {
      out.write('<header class="sapWrcTileBoxHeader">')
      const icon = this.getIcon()
      const title = this.getTitle()
      if (icon || title) {
        if (icon && title) {
          out.write('<div class="sapWrcTileBoxHeaderBegin">')
        }

        if (icon) {
          if (!this._icon) {
            this._icon = new sap.ui.core.Icon({ size: '2rem' }).addStyleClass('sapWrcTileBoxIcon sapUiTinyMarginEnd')
          }

          this._icon.setSrc(icon)
          out.renderControl(this._icon)
        }

        if (title) {
          if (!this._title) {
            this._title = new sap.m.Label().addStyleClass('sapWrcTileBoxTitle')
          }

          this._title.setText(title)
          out.renderControl(this._title)
        }

        if (icon && title) {
          out.write('</div>')
        }
      }

      const header = this.getAggregation('header')
      if (Array.isArray(header) && header.length) {
        out.write('<div class="sapWrcTileBoxHeaderEnd">')
        header.forEach((control) => out.renderControl(control))
        out.write('</div>')
      }
      out.write('</header>')
    }

    out.write('<div class="sapWrcTileBoxFlexBox">')
    const items = this.getAggregation('items')
    items.forEach((item) => out.renderControl(item))
    out.write('</div>')
  }

  TileBox.prototype.ondragenter = function (oEvent) {
    const item = this._getTargetItem(oEvent.target)
    const box = this._getTargetBox(item)
    const valid = box === TileBox._fromBox && item !== TileBox._fromItem
    this._setFocusedTarget(valid ? item : null)
  }

  TileBox.prototype.ondragstart = function (oEvent) {
    TileBox._fromBox = this.getDomRef()
    TileBox._fromItem = this._getTargetItem(oEvent.target)
  }

  TileBox.prototype.ondragend = function () {
    this._setFocusedTarget(null)
    delete TileBox._fromBox
    delete TileBox._fromItem
  }

  TileBox.prototype._setFocusedTarget = function (target) {
    if (TileBox._focusedTarget) {
      TileBox._focusedTarget.classList.remove(FOCUSED_CLASS)
    }

    if (target) {
      target.classList.add(FOCUSED_CLASS)
    }

    TileBox._focusedTarget = target
  }

  TileBox.prototype._getTargetItem = function (_target) {
    let target = _target
    const items = this.getItems()
    while (target && !items.find((item) => item.getDomRef() === target)) {
      target = target.parentNode
    }

    return target
  }

  TileBox.prototype._getTargetBox = function (_target) {
    let target = _target
    while (target && !(jQuery(target).control()[0] instanceof sap.bi.wrc.control.HBox)) {
      target = target.parentNode
    }

    return target
  }

  return TileBox
})
