sap.ui.define([], function () {
  const HTMLUtils = {
    resizeImage: (src, maxSize) => {
      return new Promise((resolve)=> {
        const canvas = document.createElement('canvas')
        const ctx = canvas.getContext("2d")
        const img = new Image()
        img.src = src
        img.onload = () => {
          ctx.imageSmoothingQuality = 'low'
          ctx.imageSmoothingEnabled = true

          let width = 0, height = 0
          if (img.width > img.height) {
            width = maxSize
            height = maxSize * (img.height / img.width)
          } else {
            height = maxSize
            width = maxSize * (img.width / img.height)
          }

          canvas.width = width
          canvas.height = height

          ctx.drawImage(img, 0, 0, width, height)
          const blob = canvas.toDataURL('image/png')
          resolve(blob)
        }
      })
    },
    ensureVisible: (uiComponent) => {
      const element = uiComponent.getDomRef()
      const o = new IntersectionObserver(([entry]) => {
        if (entry.intersectionRatio !== 1) {
          element.scrollIntoView({
            behavior: 'smooth',
            block: 'start',
            inline: 'nearest'
          })
        }

        o.disconnect()
      })
      o.observe(element);
    },

    _ensureVisible: (uiComponent) => {
      const element = uiComponent.getDomRef()
      const rect = element.getBoundingClientRect()
      const isVisible = (rect.top >= 0) && (rect.bottom <= window.innerHeight);
      if (!isVisible) {
        element.scrollIntoView({
          behavior: 'smooth',
          block: 'start',
          inline: 'nearest'
        })
      }
    }
  }

  return HTMLUtils
})
