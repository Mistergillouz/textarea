/* eslint-disable object-property-newline, max-statements, no-loop-func, no-multi-assign, no-magic-numbers, max-len */
sap.ui.define([
  'sap/ui/core/Control',
  'sap/ui/events/PseudoEvents',
  'sap/bi/webi/lib/HTMLUtils'
],
function (Control,
  PseudoEvents,
  HTMLUtils) { // eslint-disable-line

  'use strict'

  const Opened = Control.extend('sap.bi.wrc.control.Opened', {
    metadata: {
      properties: {
        title: { type: 'string', defaultValue: null },
        image: { type: 'string', defaultValue: null }
      },
      defaultAggregation: 'buttons',
      aggregations: {
        buttons: { type: 'sap.m.Button', multiple: true }
      },
      events: {
        press: {}
      },
      dnd: { droppable: false, draggable: true }
    },
    renderer: (oRm, self) => self._render(oRm)
  })

  Opened.prototype.init = function () {
    this.title = new sap.m.Text({ wrapping: false })
    this.title.addStyleClass('sapWrcOpenedTitle')
    this.icon = new sap.ui.core.Icon({ src: 'sap-icon://document-text' }).addStyleClass('sapWingTileOpenDocIcon')

    if (!Opened.pxPerRem) {
      const el = document.createElement('div');
      document.body.appendChild(el);
      el.style.width = '100rem';
      Opened.pxPerRem = el.clientWidth / 100;
      document.body.removeChild(el);
    }
  }

  Opened.prototype.exit = function () {
    this.toolbar.destroy()
    this.icon.destroy()
    this.image.destroy()
  }

  Opened.prototype.onAfterRendering = function () {
  }

  Opened.prototype.ontap = function (event) {
    this.$().focus()
    HTMLUtils.ensureVisible(this)
    const id = event.target.id
    if (id.indexOf('-action') !== -1) {
      this.firePress()
    }

    event.preventDefault()
  }

  Opened.prototype.onkeyup = function (event) {
    if (PseudoEvents.events.sapselect.fnCheck(event)) {
      this.firePress()
      event.preventDefault()
    }

    if (this.getShowDelete() && PseudoEvents.events.sapdelete.fnCheck(event)) {
      this.fireDelete()
      event.preventDefault()
    }
  }

  Opened.prototype.setImage = function (image) {
    console.log('resizing image!')
    HTMLUtils.resizeImage(image, 150)
    .then((result) => {
      console.log('image resized!')
      this.setProperty('image', result)
    })
  }

  Opened.prototype._render = function (out) {
    const tooltipText = this._getTooltipText()

    let header = `<div tabindex="0" role="button" aria-label="${tooltipText}" title="${tooltipText}"`
    out.write(header)
    out.addStyle('width', '400px').addStyle('height', '300px')
    out.writeStyles()

    out.addClass('sapUiSizeCompact sapMGT sapWrcOpenedTile')
    out.writeClasses(this)
    out.writeControlData(this)
    out.write('>')

    const buttons = this.getAggregation('buttons') || []
    const styles = `grid-template-columns: 1.5rem auto ${buttons.length ? `repeat(${buttons.length}, 1.5rem)` : ''}`
    out.write(`<div class="sapWrcOpenedGrid" style="${styles}">`)

    out.renderControl(this.icon)
    this.title.setText(this.getTitle())
    out.renderControl(this.title)

    buttons.forEach((button) => out.renderControl(button))
    out.write('</div>')

    // const image = this.getImage()
    const image = 'https://i.skyrock.net/6372/90456372/pics/3211569297_1_4_3SYW6bhI.jpg'
    if (image) {
      out.write(`<div class="sapWrcOpenedImage sapMPointer" style="background: url(${image})"/>`)
    }

    out.write('</div>')
  }

  Opened.prototype._getTooltipText = function () {
    let tooltipText = this.getTitle()
    return tooltipText
  }

  return Opened
})
