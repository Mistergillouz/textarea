sap.ui.define([], function () {
  const UI5Utils = {
    bundle: null,
    getLocalizedText: (id) => {
      return UI5Utils.getBundle().getText(id)
    },
    getBundle: () => {
      if (!UI5Utils.bundle) {
        UI5Utils.bundle = UI5Utils.getModel().getResourceBundle()
      }

      return UI5Utils.bundle
    },
    getModel: () => {
      return new sap.ui.model.resource.ResourceModel({
        bundleUrl: 'i18n.properties'
      })
    }
  }

  sap.ui.getCore().setModel(UI5Utils.getModel(), 'i18n')
  return UI5Utils
})
