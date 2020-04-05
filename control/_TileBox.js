/* eslint-disable no-loop-func */
/* eslint-disable object-property-newline */
sap.ui.define([
  'sap/ui/core/Control',
  'sap/ui/events/PseudoEvents'
], function (
  Control,
  PseudoEvents
) {
  'use strict'

  const FOCUSED_CLASS = 'sapWingTileFocused'
  const GRID_CLASS = 'sapWrcTileBoxGrid'

  const Box = Control.extend('sap.bi.wrc.control.TileBox', {
    metadata: {
      properties: {
        maxRows: { type: 'int', defaultValue: 2 },
        minSize: { type: 'sap.ui.core.CSSSize', defaultValue: '100px' },
        maxSize: { type: 'sap.ui.core.CSSSize', defaultValue: '152px' },
        gap: { type: 'sap.ui.core.CSSSize', defaultValue: '.5rem' },
      },
      defaultAggregation: 'content',
      aggregations: {
        content: { type: 'sap.ui.core.Control', multiple: true }
      },

      dnd: { droppable: true, draggable: false }
    },
    renderer: (oRm, self) => self._render(oRm)
  })

  Box.prototype.init = function () {
    Control.prototype.init.call(this)
  }

  Box.prototype.destroy = function () {
    Control.prototype.destroy.call(this)
  }

  Box.prototype._render = function (out) {
    let header = `<div role="layout"`
    out.write(header)
    out.writeStyles()

    out.addClass('sapUiSizeCompact sapWrcTileBox')
    out.writeClasses(this)
    out.writeControlData(this)
    out.write('>')

    const styles = this._getGridStyles()
    out.write(`<div class="${GRID_CLASS}" style="${styles}">`)
    this.getAggregation('content').forEach((control) => out.renderControl(control))
    out.write('</div>')

    out.write('</div>')
  }

  Box.prototype.ondragenter = function (oEvent) {
    const item = this._getTargetItem(oEvent.target)
    const box = this._getTargetBox(item)
    const valid = box === Box._fromBox && item !== Box._fromItem
    this._setFocusedTarget(valid ? item : null)
  }

  Box.prototype.ondragstart = function (oEvent) {
    Box._fromBox = this.getDomRef()
    Box._fromItem = this._getTargetItem(oEvent.target)
  }

  Box.prototype.ondragend = function () {
    this._setFocusedTarget(null)
    delete Box._fromBox
    delete Box._fromItem
  }

  Box.prototype._setFocusedTarget = function (target) {
    if (Box._focusedTarget) {
      Box._focusedTarget.classList.remove(FOCUSED_CLASS)
    }

    if (target) {
      target.classList.add(FOCUSED_CLASS)
    }

    Box._focusedTarget = target
  }

  Box.prototype._getGridStyles = function () {
    const styles = []
    const maxRows = this.getMaxRows()
    if (maxRows === 0) {
      styles.push(`grid-template-columns: repeat(auto-fill, minmax(${this.getMinSize()}, ${this.getMaxSize()}))`)
    } else {
      const content = this.getAggregation('content')
      styles.push(`grid-template-columns: repeat(${Math.floor((content.length + 1) / maxRows)},  ${this.getMaxSize()})`)
    }

    const gap = this.getGap()
    styles.push(`padding: ${gap} 0`)
    styles.push(`grid-gap: ${gap}`)
    return styles.join('; ')
  }

  Box.prototype._getTargetItem = function (_target) {
    let target = _target
    const items = this.getItems()
    while (target && !items.find((item) => item.getDomRef() === target)) {
      target = target.parentNode
    }

    return target
  }

  Box.prototype._getTargetBox = function (_target) {
    let target = _target
    while (target && !(jQuery(target).control()[0] instanceof sap.bi.wrc.control.HBox)) {
      target = target.parentNode
    }

    return target
  }


  Box.prototype._getGrid = function () {
    return this.getDomRef().getElementsByClassName(GRID_CLASS)[0]
  }

  return Box
})

