/* eslint-disable object-property-newline, max-statements, no-loop-func, no-multi-assign, no-magic-numbers, max-len */
sap.ui.define([
  'sap/ui/core/Control',
  'sap/ui/events/PseudoEvents',
  'sap/bi/webi/lib/UI5Utils',
  'sap/bi/webi/lib/HTMLUtils'
],
function (Control,
  PseudoEvents,
  UI5Utils,
  HTMLUtils) { // eslint-disable-line
  'use strict'

  const Tile = Control.extend('sap.bi.wrc.control.Tile', {
    metadata: {
      properties: {
        width: { type: 'sap.ui.core.CSSSize', defaultValue: '9.5rem' },
        height: { type: 'sap.ui.core.CSSSize', defaultValue: '9.5rem' },
        title: { type: 'string', defaultValue: null },
        backgroundIcon: { type: 'sap.ui.core.URI', defaultValue: null },
        image: { type: 'string', defaultValue: null },
        showMore: { type: 'boolean', defaultValue: true },
        showDelete: { type: 'boolean', defaultValue: false },
        showFavorite: { type: 'boolean', defaultValue: false },
        isFavorite: { type: 'boolean', defaultValue: false }
      },
      defaultAggregation: 'icons',
      aggregations: {
        icons: { type: 'sap.bi.wrc.control.TileIcon', multiple: true }
      },
      events: {
        press: {},
        delete: {},
        favorite: {},
        more: {}
      },
      dnd: { droppable: false, draggable: true }
    },
    renderer: (oRm, self) => self._render(oRm)
  })

  Tile.prototype.init = function () {
    this.title = new sap.m.Text({ maxLines: 2 })
    this.title.addStyleClass('sapWingWRCTileTitle')

  }

  Tile.prototype.exit = function () {
    this.title.destroy()
    if (this.backgroundIcon) {
      this.backgroundIcon.destroy()
    }
    if (this.deleteButton) {
      this.deleteButton.destroy()
    }
    if (this.favoriteIcon) {
      this.favoriteIcon.destroy()
    }
  }

  Tile.prototype._onDragStart = function (oEvent) {
  }

  Tile.prototype.onAfterRendering = function () {
    this.$().bind('mouseenter', () => this._updateAriaAndTitle())
    this.$().bind('mouseleave', () => this._removeTooltipFromControl())
  }

  // Tile.prototype.onfocusin = function(oEvent) {
  //   this.getDomRef().scrollIntoView({
  //     behavior: 'smooth'
  //   })
  // }

  Tile.prototype.ontap = function (event) {
    HTMLUtils.ensureVisible(this)

    const id = event.target.id
    if (id.indexOf('-action') === -1) {
      this.firePress()
    } else if (id.indexOf('remove') !== -1) {
      this.fireDelete()
    } else if (id.indexOf('fav') !== -1) {
      this.fireFavorite({ favorite: !this.getIsFavorite() })
    } else if (id.indexOf('more') !== -1) {
      this.fireMore()
    }

    event.preventDefault()
  }

  Tile.prototype.onkeyup = function (event) {
    if (PseudoEvents.events.sapselect.fnCheck(event)) {
      this.firePress()
      event.preventDefault()
    }

    if (this.getShowDelete() && PseudoEvents.events.sapdelete.fnCheck(event)) {
      this.fireDelete()
      event.preventDefault()
    }
  }

  Tile.prototype._render = function (out) {
    const tooltipText = this._getTooltipText()
    const image = this.getImage()
    const backgroundIcon = this.getBackgroundIcon()

    let header = `<div tabindex="0" role="button" aria-label="${tooltipText}"`
    if (image) {
      header += ' data-image="true"'
    }
    out.write(header)

    out.addStyle('width', this.getWidth())
    out.addStyle('height', this.getHeight())
    out.writeStyles()

    out.addClass('sapUiSizeCompact sapWingWRCTile sapMGT sapMGTScopeActions sapMPointer')
    out.writeClasses(this)
    out.writeControlData(this)
    out.write('>')

    out.write('<div class="sapWingWRCTileInner">')

    if (image) {
      out.write(`<div class="sapWingTileBackgroundImage" style="background-image: url(${image})"/>`)
    } else if (backgroundIcon) {
      if (!this.backgroundIcon) {
        this.backgroundIcon = new sap.ui.core.Icon({ size: '5rem' })
      }

      this.backgroundIcon.setSrc(backgroundIcon)
      out.write('<div class="sapWingTileBackgroundIcon">')
      out.renderControl(this.backgroundIcon)
      out.write('</div>')
    }

    //

    const gridColumns = this.getShowFavorite() ? '1.5rem 1fr' : '1fr'
    out.write(`<div class="sapWingTitleGrid" style="grid-template-columns: ${gridColumns}">`)

    if (this.getShowFavorite()) {
      const msgId = this.getIsFavorite() ? 'welcome.tile.unfavorite.tooltip' : 'welcome.tile.favorite.tooltip'
      const text = UI5Utils.getLocalizedText(msgId)
      out.write(`<button class="sapWingFavoriteButton" id="${this.getId()}-action-fav" title="${text}">`)

      if (!this.favoriteIcon) {
        this.favoriteIcon = new sap.ui.core.Icon({
          id: `${this.getId()}-action-fav-icon`
        })
      }

      this.favoriteIcon.setSrc(this.getIsFavorite() ? 'sap-icon://favorite' : 'sap-icon://unfavorite')
      out.renderControl(this.favoriteIcon)
      out.write('</button>')
    }

    this.title.setText(this.getTitle())
    out.renderControl(this.title)

    out.write('</div>')

    const tileIcons = this.getAggregation('icons')
    if (Array.isArray(tileIcons)) {
      const rowsCount = tileIcons.reduce((acc, tileIcon) => {
        let rows = 0
        if (tileIcon.getVisible()) {
          rows = tileIcon.getAdditionalText() ? 2 : 1
        }

        return acc + rows
      }, 0)

      if (rowsCount) {
        out.write(`<div class="sapWingWRCTileIcons" style="grid-template-rows: repeat(${rowsCount}, 1rem)">`)
        tileIcons.forEach((tileIcon) => out.renderControl(tileIcon))
        out.write('</div>')
      }
    }

    out.write('</div>')

    if (this.getShowDelete()) {
      if (!this.deleteButton) {
        this.deleteButton = this._createOutsideButton({
          suffix: 'action-remove',
          icon: 'sap-icon://decline',
          tooltip: UI5Utils.getLocalizedText('welcome.tile.close.tooltip')
        })

        this.deleteButton._bExcludeFromTabChain = true
      }

      out.renderControl(this.deleteButton)
    }
    if (this.getShowMore()) {
      if (!this.moreButton) {
        this.moreButton = new sap.m.Button({
          id: `${this.getId()}-action-more`,
          icon: 'sap-icon://overflow',
          tooltip: 'More'
        })

        this.moreButton.addStyleClass('sapWingTileMoreButton')
      }

      out.renderControl(this.moreButton)
    }

    out.write('</div>')
  }

  Tile.prototype._createOutsideButton = function (args) {
    const button = new sap.m.Button({
      id: `${this.getId()}-${args.suffix}`,
      icon: args.icon || null,
      tooltip: args.tooltip || null
    })

    button.addStyleClass('sapMGTRemoveButton')

    if (args.classes) {
      button.addStyleClass(args.classes)
    }

    return button
  }

  Tile.prototype._getTooltipText = function () {
    let tooltipText = `${this.getTitle()}.`
    const tileIcons = this.getAggregation('icons') || []
    tileIcons.forEach((tileIcon) => {
      const text = tileIcon.getText()
      if (text) {
        tooltipText += `\n${text}`
      }
      const additionalText = tileIcon.getAdditionalText()
      if (additionalText) {
        tooltipText += `\n${additionalText}`
      }
    })

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
