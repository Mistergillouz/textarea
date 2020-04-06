/* eslint-disable prefer-object-spread, max-len, capitalized-comments */
sap.ui.define(['sap/ui/events/PseudoEvents'], function (PseudoEvents) {
  'use strict'

  const TILE_CLASSES = [
    'sapWrcGetStartedTile',
    'sapWingWRCTile'
  ]

  const WRCTRIX = 'WRCTRIX'

  const COLORS = [ '#cc00cc', '#cc0000', '#cccc00', '#00cccc' ]
  let FORMS = null

  let TILE_SIZE = 0

  const TILE_MAX_SIZE = 100
  const MARGINS = 32
  const BORDER_SIZE = 6
  const MILLIS = 25

  const TILES_WIDTH = 7
  const TILES_HEIGHT = 9

  const MAX_TILES_WIDTH = TILES_WIDTH + 2
  const MAX_TILES_HEIGHT = TILES_HEIGHT + 2

  class Tetris {
    constructor (initParams) {
      this.paused = false
      this.callback = initParams.callback
      this._transitionEnd = {}
      this.tileElements = []

      const welcome = document.body.querySelector('.sapWingWelcomeView')
      TILE_CLASSES.forEach((tileClass) => {
        const tiles = Array.from(welcome.getElementsByClassName(tileClass)).map((element) => new Tile(element))
        this.tileElements = this.tileElements.concat(tiles)
      })

      FORMS = this.initForms()
      this.hide().then(() => this.start())
    }

    destroy () {
      this.mainContainer.parentNode.removeChild(this.mainContainer)
      delete this.mainContainer
    }

    start () {
      this.createLayout()

      this.grid = []
      for (let i = 0; i < TILES_HEIGHT; i++) {
        this.grid.push(new Array(TILES_WIDTH).fill(false))
      }

      this.animation = null
      this.timerId = setInterval(() => this.tick(), MILLIS)
      this.startTime = Date.now()
      this.mainContainer.addEventListener('keydown', (event) => this.onKeyDown(event))
    }

    tick () {
      if (this.paused) {
        return
      }

      if (!this.animation) {
        const formIndex = 3 // Math.floor(Math.random() * FORMS.length)
        const form = FORMS[formIndex].clone()

        const x = Math.ceil((TILES_WIDTH - form.width) / 2) * TILE_SIZE
        const rect = this.toGridRect(x, 0, form)
        if (!this.canFitGrid(form, rect)) {
          this.gameOver()
          return
        }

        const color = COLORS[Math.floor(Math.random() * COLORS.length)]
        const brick = this.newBrick(form, color)
        const speed = 2 + ((Date.now() - this.startTime) / (60 * 1000)) * 5

        this.animation = new Animation(brick, form, speed)
        this.animation.left = x


        this.playground.appendChild(brick)
      }


      const { form, speed } = this.animation
      const y = this.animation.top + speed
      const x = this.animation.left

      const rect = this.toGridRect(x, y)
      const canFit = this.canFitGrid(form, rect)
      if (canFit) {
        this.animation.top = y
      } else {
        this.setInGrid().then(() => {
          this.animation = null
        })
      }
    }

    gameOver () {
      clearInterval(this.timerId)
    }

    onKeyDown (event) {
      let handled = false
      if (!this.paused) {
        if (PseudoEvents.events.sapleft.fnCheck(event)) {
          this.moveBrick('left')
          handled = true
        } else if (PseudoEvents.events.sapright.fnCheck(event)) {
          this.moveBrick('right')
          handled = true
        } else if (PseudoEvents.events.sapup.fnCheck(event)) {
          this.moveBrick('up')
          handled = true
        } else if (PseudoEvents.events.sapdown.fnCheck(event)) {
          this.moveBrick('down')
          handled = true
        } else if (PseudoEvents.events.sapescape.fnCheck(event)) {
          this.gameOver()
          handled = true
        }
      }

      if (handled) {
        event.preventDefault()
        event.stopPropagation()
      }
    }

    newBrick (form, color) {
      const div = document.createElement('div')
      div.style.position = 'absolute'
      div.style.width = form.width * TILE_SIZE + 'px'
      div.style.height = form.height * TILE_SIZE + 'px'
      div.style.transition = 'all 0.5s ease-out 0s'
      div.style.top = 0

      displayGrid(div, form)

      const tileSize = TILE_SIZE - (2 * BORDER_SIZE)
      for (let y = 0; y < form.height; y++) {
        for (let x = 0; x < form.width; x++) {
          const container = document.createElement('div')
          if (!form.contains(x, y)) {
            div.appendChild(container)
            continue
          }

          container.style.position = 'relative'

          const tileIndex = Math.floor(Math.random() * this.tileElements.length)
          const tile = this.tileElements[tileIndex]

          const innerTile = document.createElement('div')
          innerTile.style.position = 'absolute'
          innerTile.style.top = 0
          innerTile.innerHTML = new String(tile.html)
          innerTile.style.opacity = 0.9

          const scale = Math.min(tileSize / tile.height, tileSize / tile.width)
          innerTile.style.transform = `scale(${scale})`

          const origin = Math.floor(BORDER_SIZE / scale)
          innerTile.style['transform-origin'] = `${origin}px ${origin}px`

          innerTile.classList.add('sapWrcBrick')

          const canvas = document.createElement('canvas')
          canvas.width = TILE_SIZE
          canvas.height = TILE_SIZE

          container.appendChild(canvas)
          container.appendChild(innerTile)

          div.appendChild(container)

          const ctx = canvas.getContext("2d")
          this.drawBorder (ctx, 0, 0, canvas.width, canvas.height, color)
        }
      }

      return div
    }


    createLayout () {
      const mainContainer = document.createElement('div')
      mainContainer.style.position = 'fixed'
      mainContainer.style.top = mainContainer.style.left = mainContainer.style.right = mainContainer.style.bottom = 0
      mainContainer.style.background = 'black'
      mainContainer.style.zIndex = 5000
      mainContainer.setAttribute('tabindex', 0)

      const height = document.body.offsetHeight
      const width = document.body.offsetWidth

      TILE_SIZE = Math.floor(Math.min(
        (width - MARGINS * 2) / MAX_TILES_WIDTH,
        (height - MARGINS * 2) / MAX_TILES_HEIGHT,
        TILE_MAX_SIZE))

      const x = (width - (TILE_SIZE * MAX_TILES_WIDTH))  / 2
      const y = (height - (TILE_SIZE * MAX_TILES_HEIGHT))  / 2

      const container = document.createElement('div')
      container.style.position = 'absolute'
      container.style.left = x + 'px'
      container.style.top = y + 'px'
      container.style.width = (TILE_SIZE * MAX_TILES_WIDTH) + 'px'
      container.style.height = (TILE_SIZE * MAX_TILES_HEIGHT) + 'px'
      container.style.background = 'black'

      const top = document.createElement('canvas')
      top.style.position = 'absolute'
      top.style.height = TILE_SIZE + 'px'
      top.style.width = '100%'

      const bottom = document.createElement('canvas')
      bottom.style.position = 'absolute'
      bottom.style.bottom = 0
      bottom.style.height = TILE_SIZE + 'px'
      bottom.style.width = '100%'

      const left = document.createElement('canvas')
      left.style.position = 'absolute'
      left.style.top = TILE_SIZE + 'px'
      left.style.width = TILE_SIZE + 'px'
      left.style.height = `calc(100% - ${TILE_SIZE * 2}px)`

      const right = document.createElement('canvas')
      right.style.position = 'absolute'
      right.style.right = 0
      right.style.top = TILE_SIZE + 'px'
      right.style.width = TILE_SIZE + 'px'
      right.style.height = `calc(100% - ${TILE_SIZE * 2}px)`

      const playground = document.createElement('div')
      playground.style.position = 'absolute'
      playground.style.overflow = 'hidden'
      playground.style.right = TILE_SIZE + 'px'
      playground.style.top = TILE_SIZE + 'px'
      playground.style.width = `calc(100% - ${TILE_SIZE * 2}px)`
      playground.style.height = `calc(100% - ${TILE_SIZE * 2}px)`

      container.appendChild(top)
      container.appendChild(left)
      container.appendChild(bottom)
      container.appendChild(right)
      container.appendChild(playground)

      mainContainer.appendChild(container)
      document.body.appendChild(mainContainer)

      this.drawBorderCanvas(top, TILE_SIZE)
      this.drawBorderCanvas(left, TILE_SIZE)
      this.drawBorderCanvas(right, TILE_SIZE)
      this.drawBorderCanvas(bottom, TILE_SIZE)

      this.drawText(bottom, TILE_SIZE, WRCTRIX)

      Object.assign(this, {
        mainContainer,
        playground
      })
    }

    hide (hide = true) {
      return new Promise((resolve) => {
        setTimeout(() => {
          const rootElements = Array.from(document.body.querySelectorAll('.sapWing .sapUiView'))
          rootElements.forEach((element) => {
            if (hide) {
              this._transitionEnd[element.id] = this.transitionEnd.bind(this, element, resolve)
              element.addEventListener('transitionend', this._transitionEnd[element.id], true)
              element.classList.add('sapWrcTetrisOn')
            } else {
              element.classList.remove('sapWrcTetrisOn')
              element.style.display = 'block'
              resolve()
            }
          })
        })
      }, 0)
    }

    transitionEnd (element, resolve) {
      element.style.display = 'none'
      element.removeEventListener('transitionend', this._transitionEnd[element.id])
      delete this._transitionEnd[element.id]
      resolve()
    }

    drawText (canvas, TILE_SIZE, text) {
      const ctx = canvas.getContext("2d")
      ctx.font = "2rem Arial";
      ctx.fillStyle = 'white'
      for (let i = 0; i < text.length; i++) {
        const char = text.charAt(i)
        const metrics = ctx.measureText(char)
        ctx.fillText(char,
          (TILE_SIZE * i) + (TILE_SIZE - metrics.width) / 2,
          (TILE_SIZE + metrics.actualBoundingBoxAscent + metrics.actualBoundingBoxDescent) / 2)
      }
    }

    drawBorderCanvas (canvas, TILE_SIZE) {
      canvas.width = canvas.clientWidth
      canvas.height = canvas.clientHeight
      this.drawBorders(canvas, TILE_SIZE, '#666666')
    }

    drawBorders (canvas, TILE_SIZE, color) {
      const ctx = canvas.getContext("2d")
      for (let x = 0; x < canvas.width; x += TILE_SIZE) {
        for (let y = 0; y < canvas.height; y += TILE_SIZE) {
          this.drawBorder(ctx, x, y, TILE_SIZE, TILE_SIZE, color)
        }
      }
    }

    drawBorder (ctx, x, y, tileWidth, tileHeight, color) {
      ctx.fillStyle = color
      ctx.fillRect(x, y, tileWidth, tileHeight)

      ctx.beginPath();
      ctx.strokeStyle = this.shadeColor(color, 50) // '#999999'
      for (let i = 0; i < BORDER_SIZE; i++) {
        ctx.moveTo(x + tileWidth - i, y + i)
        ctx.lineTo(x + i, y + i)
        ctx.lineTo(x + i, y + tileHeight - i)
      }

      ctx.stroke()

      ctx.beginPath()
      ctx.strokeStyle = this.shadeColor(color, -50) // '#333333'
      for (let i = 0; i < BORDER_SIZE; i++) {
        ctx.moveTo(x + tileWidth - i, y + i)
        ctx.lineTo(x + tileWidth - i, y + tileHeight - i)
        ctx.lineTo(x + i, y + tileHeight - i)
      }

      ctx.stroke()
    }

    shadeColor (color, percent) {
      let R = parseInt(color.substring(1,3), 16);
      let G = parseInt(color.substring(3,5), 16);
      let B = parseInt(color.substring(5,7), 16);

      R = parseInt(R * (100 + percent) / 100)
      G = parseInt(G * (100 + percent) / 100)
      B = parseInt(B * (100 + percent) / 100)

      R = (R < 255) ? R : 255
      G = (G < 255) ? G : 255
      B = (B < 255) ? B : 255

      var RR = ((R.toString(16).length ===1 ) ? '0' + R.toString(16) : R.toString(16))
      var GG = ((G.toString(16).length === 1) ? '0' + G.toString(16) : G.toString(16))
      var BB = ((B.toString(16).length === 1) ? '0' + B.toString(16) : B.toString(16))

      return '#' + RR+GG+BB
    }

    toGridRect (x, y, _form = null) {
      const form = _form || this.animation.form
      const left = Math.floor(x / TILE_SIZE)
      const top = Math.ceil(y / TILE_SIZE)
      const rect = {
        left,
        right: left + form.width,
        top,
        bottom: top + form.height
      }

      return rect
    }

    canFitGrid (form, rect) {
      if (rect.left < 0 || rect.top < 0 || rect.right > TILES_WIDTH || rect.bottom > TILES_HEIGHT) {
        return false
      }

      for (let y = rect.top; y < rect.bottom; y++) {
        for (let x = rect.left; x < rect.right; x++) {
          if (!form.contains(x - rect.left, y - rect.top)) {
            continue
          }
          if (this.grid[y][x]) {
            return false
          }
        }
      }

      return true
    }

    setInGrid (_rect) {
      return new Promise((resolve) => {
        this.paused = true
        const rect = _rect || this.toGridRect(this.animation.left, this.animation.top)

        this.animation.asyncTop(rect.top * TILE_SIZE).then(() => {
          const { form } = this.animation
          for (let y = rect.top; y < rect.bottom; y++) {
            for (let x = rect.left; x < rect.right; x++) {
              if (form.contains(x - rect.left, y - rect.top)) {
                this.grid[y][x] = true
              }
            }
          }

          const indices = []
          this.grid.forEach((row, index) => {
            if (row.every((state) => state)) {
              indices.push(index)
            }
          })

          const toDelete = []
          const toMove = []
          indices.forEach((rowIndex) => {
            this.grid.splice(rowIndex, 1)
            this.grid.splice(0, 0, new Array(TILES_WIDTH).fill(false))

            const top = rowIndex * TILE_SIZE
            Array.from(this.playground.children).forEach((child) => {
              const offsetTop = child.offsetTop
              if (offsetTop < top) {
                toMove.push(child)
              }
              Array.from(child.children).forEach((brick) => {
                if (top >= (offsetTop + brick.offsetTop) && top < (offsetTop + brick.offsetTop + brick.offsetHeight)) {
                  toDelete.push(brick)
                }
              })
            })
          })
          
          toDelete.forEach((element) => element.remove())
          toMove.forEach((element) => element.style.top = parseFloat(element.style.top) + TILE_SIZE + 'px')

          this.paused = false
          console.log(this.grid)
          resolve()
        })
      })
    }

    moveBrick (where) {
      let { form, top, left } = this.animation

      switch (where) {
        case 'left':
        case 'right':
          if (where === 'left') {
            left -= TILE_SIZE
          } else {
            left += TILE_SIZE
          }

          const rect = this.toGridRect(left, top)
          if (this.canFitGrid(form, rect)) {
            this.animation.left = rect.left * TILE_SIZE
          }
          break

        case 'down': {
          const rect = this.toGridRect(left, top)
          for (let y = TILES_HEIGHT - 1; y > rect.top; y--) {
            const bottomRect = Object.assign({}, rect, {
              top: y,
              bottom: y + rect.bottom - rect.top
            })

            if (this.canFitGrid(form, bottomRect)) {
              this.paused = true
              this.setInGrid(bottomRect).then(() => {
                this.animation = null
                this.paused = false
              })
              break
            }
          }
          break
        }

        case 'up': {
          if (!this.animation.canRotate()) {
            return
          }

          const { form, left, top } = this.animation
          const rotated = form.rotate()
          const rect = this.toGridRect(left, top, rotated)
          if (this.canFitGrid(rotated, rect)) {
            this.animation.rotate()
          }

          break
        }
      }
    }

    set animation (animation) {
      if (this.animation) {
        this.animation.destroy()
      }

      this._animation = animation
    }

    get animation () {
      return this._animation
    }

    set paused (enabled) {
      this._paused = enabled
    }

    get paused () {
      return this._paused
    }

    initForms () {
      return [
        new Form(2, 2),

        new Form([
          [true],
          [true],
          [true]
        ]),

        new Form([
          [true, true, true]
        ]),

        // XXX
        // X
        new Form([
          [true, true,  true],
          [true, false, false]
        ]),
        // X
        // XXX
        new Form([
          [true, false, false],
          [true, true,  true]
        ]),

        //  XXX
        //   X
        new Form([
          [true,  true, true],
          [false, true, false]
        ]),
        //   X
        //  XXX
        new Form([
          [false, true, false],
          [true,  true, true]
        ]),
        //  X
        // XX
        // X
        new Form([
          [false, true],
          [true,  true],
          [true, false]
        ])
      ]
    }
  }

  class Tile {
    constructor(element) {
      this.element = element
      this.width = element.offsetWidth
      this.height = element.offsetHeight
    }

    get html () {
      return this.element.outerHTML
    }

    get width () {
      return this._width
    }

    get height () {
      return this._height
    }

    set width (value) {
      this._width = value
    }

    set height (value) {
      this._height = value
    }
  }

  class Form {
    constructor() {
      if (Array.isArray(arguments[0])) {
        this.matrix = arguments[0]
        this.height = this.matrix.length
        this.width = this.matrix[0].length
      } else if (arguments.length === 2) {
        this.width = arguments[0]
        this.height = arguments[1]
      }
    }

    canRotate () {
      return this.height !== this.width
    }

    contains (x, y) {
      if (!this.matrix) {
        return true
      }

      return Boolean(this.matrix[y][x])
    }

    rotate () {
      if (this.matrix) {
        const flip = (matrix) => matrix[0].map((_column, index) => matrix.map(row => row[index]))
        const matrix = JSON.parse(JSON.stringify(this.matrix))
        const rotated = flip(matrix.reverse())
        return new Form(rotated)
      }

      return new Form(this.height, this.width)
    }

    clone () {
      const clone = new Form()
      return Object.assign(clone, JSON.parse(JSON.stringify(this)))
    }
  }

  class Animation {
    constructor(target, form, speed) {
      this.target = target
      this.form = form
      this.speed = Math.floor(speed)
      this.start = Date.now()
      this.offsetX = 0
      this.offsetY = 0
      this.rotation = 0
    }

    destroy () {
    }

    canRotate () {
      return this.form.canRotate()
    }

    rotate () {
      let index = 0
      const matrix = JSON.parse(JSON.stringify(this.form.matrix))
      matrix.forEach((row) => row.forEach((_, cellIndex) => row[cellIndex] = index++))

      const children = Array.from(this.target.children)
      const rotatedChildren = []

      const resultForm = new Form(matrix).rotate()
      resultForm.matrix.forEach((row, rowIndex) => {
        row.forEach((index, colIndex) => {
          if (index !== -1) {
            const element = children[index]
            rotatedChildren.push(element)
            this.target.removeChild(element)
          }
        })
      })

      rotatedChildren.forEach((element) => this.target.appendChild(element))
      displayGrid(this.target, resultForm)

      this.form = this.form.rotate()
      this.updateBox()
    }

    get top () {
      return this._top
    }

    set top (top) {
      if (top === this.top) {
        debugger
      }
      this.target.style.top = Math.floor(top) + 'px'
      this.updateBox()
    }

    get left () {
      return this._left
    }

    set left (left) {
      this.target.style.left = left + 'px'
    }

    updateBox () {
      const rect = this.target.getBoundingClientRect()
      const parentRect = this.target.parentNode.getBoundingClientRect()
      this._top = Math.round(rect.top - parentRect.top)
      this._left = Math.round(rect.left - parentRect.left)
    }

    asyncTop (top) {
      const start = Date.now()
      return new Promise((resolve) => {
        const fnListener = () => {
          console.log('asyncTop', Date.now() - start)
          this.target.removeEventListener('transitionend', fnListener)
          resolve()
        }

        this.target.addEventListener('transitionend', fnListener, true)
        this.target.style.top = Math.floor(top) + 'px'
      })
    }
  }


  function displayGrid (div, form) {
    div.style.display = 'grid'
    div.style.gridTemplateColumns = `repeat(${form.width}, ${TILE_SIZE}px)`
    div.style.gridAutoRows = TILE_SIZE + 'px'
  }

  return Tetris
})
