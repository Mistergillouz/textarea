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
  const RESIZER_CLASS = 'sapWrcTileBoxResizer'

  const Box = Control.extend('sap.bi.wrc.control.TileBox', {
    metadata: {
      properties: {
        maxRows:  { type: 'int', defaultValue: 0 },
        increment: { type: 'sap.ui.core.CSSSize', defaultValue: '152px' },
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
    this._onResizeEvent = this._onResizeEvent.bind(this)
    // this._resizeListener = sap.ui.core.ResizeHandler.register(this, (oEvent) => this._onResize(oEvent))
  }

  Box.prototype.destroy = function () {
    Control.prototype.destroy.call(this)
  }

  Box.prototype.onAfterRendering = function () {
    this.attachBrowserEvent('mouseover', (oEvent) => this._onMouseOver(oEvent))
    this.attachBrowserEvent('mouseleave', (oEvent) => this._onMouseLeave(oEvent))
  }

  Box.prototype.onkeyup = function (oEvent) {
    const e = PseudoEvents
    debugger
  }

  Box.prototype.onmousedown = function (oEvent) {
    if (!this._resize) {
      if (oEvent.target.classList.contains(RESIZER_CLASS)) {
        oEvent.preventDefault()
        this._beginResize(oEvent)
      }
    }
  }

  Box.prototype._onMouseOver = function (oEvent) {
    if (!this._resize) {
      const onResizer = oEvent.target.classList.contains(RESIZER_CLASS)
      if (!onResizer) {
        this._setResizerVisible(false)
        this.$().removeClass('sapWrcTileBoxNoScrollBar')
      }
    }
  }

  Box.prototype._onMouseLeave = function (oEvent) {
    if (!this._resize) {
      if (this.getMaxRows()) {
        this.$().addClass('sapWrcTileBoxNoScrollBar')
      }
      this._setResizerVisible(true)
    }
  }

  Box.prototype._beginResize = function (oEvent) {
    window.addEventListener('mousemove', this._onResizeEvent, false)
    window.addEventListener('mouseup', this._onResizeEvent, false)

    document.body.style.cursor = 'row-resize'
    this._getResizer().style.zIndex = 1000
    this._resize = {
      startY: oEvent.clientY,
      offsetY: oEvent.offsetY,
      amount: 0
    }
  }

  Box.prototype._endResize = function () {
    window.removeEventListener('mousemove', this._onResizeEvent, false)
    window.removeEventListener('mouseup', this._onResizeEvent, false)

    document.body.style.cursor = 'auto'
    this._getResizer().style.bottom = 'unset'
    this._getResizer().style.zIndex = 0
    delete this._resize
  }

  Box.prototype._onResizeEvent = function (oEvent) {
    switch (oEvent.type) {

      case 'mousemove':
        console.log('clientY', oEvent.clientY, 'offsetY', oEvent.offsetY, 'pageY', oEvent.pageY)
        this._resize.amount = this._resize.startY - oEvent.clientY
        let cursor = 'row-resize'
        if (this._resize.amount < 0 && !this._isScrollbarVisible()) {
          cursor = 'not-allowed'
        }

        const resizer = this._getResizer()
        resizer.style.bottom = `${this._resize.amount - this._resize.offsetY}px`
        document.body.style.cursor = cursor
        console.log(this._resize.amount)
        break

      case 'mouseup':
        const increment = this._toPixel(this.getIncrement())
        const positions = this._getRowPositions()
        const position = this._getGrid().clientHeight - this._resize.amount - this._resize.offsetY

        const index = positions.findIndex((top) => position >= Number(top) && position < (Number(top) + increment))
        if (index !== -1) {
          let maxRows = 0
          if (index < (positions.length - 1)) {
            maxRows = index + 1
          }

          this.setMaxRows(maxRows)
        }

        this._endResize()
        break

      default:
        console.log('unhandled event:', oEvent.type)
        this._endResize()
    }
  }

  Box.prototype._render = function (out) {
    let header = `<div role="layout"`
    out.write(header)
    out.writeStyles()

    out.addClass('sapUiSizeCompact sapWrcTileBox')
    out.writeClasses(this)
    out.writeControlData(this)
    out.write('>')

    const content = this.getAggregation('content') || []
    const styles = this._getGridStyles()
    out.write(`<div class="${GRID_CLASS}" style="${styles}">`)
    content.forEach((control) => out.renderControl(control))
    out.write('</div>')

    out.write(`<div id="${this.getId()}-resizer" class="${RESIZER_CLASS}"/>`)

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
      styles.push(`grid-template-columns: repeat(auto-fill, minmax(${this.getIncrement()}, max-content))`)
    } else {
      const content = this.getAggregation('content')
      styles.push(`grid-template-columns: repeat(${Math.floor((content.length + 1) / maxRows)}, auto)`)
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

  Box.prototype._getResizer = function () {
    return this.getDomRef().getElementsByClassName(RESIZER_CLASS)[0]
  }

  Box.prototype._getGrid = function () {
    return this.getDomRef().getElementsByClassName(GRID_CLASS)[0]
  }

  Box.prototype._setResizerVisible = function (visible) {
    const resizer = this._getResizer()
    const isScrollbarVisible = this._isScrollbarVisible()

    if (visible) {
      if (isScrollbarVisible) {
        resizer.style.display = 'block'
      } else {
        resizer.style.visibility = 'visible'
      }
    } else if (isScrollbarVisible) {
      resizer.style.display = 'none'
    } else {
      resizer.style.visibility = 'hidden'
    }
  }

  Box.prototype._isScrollbarVisible = function () {
    return this.getMaxRows() > 0
  }

  Box.prototype._getRowPositions = function () {
    const top = this.getAggregation('content').reduce((acc, control) => {
      acc[control.getDomRef().offsetTop] = true
      return acc
    }, {})

    return Object.keys(top)
  }

  Box.prototype._toPixel = function (cssSize) {
    const el = document.createElement('div')
    document.body.appendChild(el)
    el.style.width = cssSize
    const pixels = el.clientWidth
    document.body.removeChild(el)
    return pixels
  }

  return Box
})

