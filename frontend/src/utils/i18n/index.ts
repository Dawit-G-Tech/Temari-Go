import i18n from "i18next";
import { initReactI18next } from "react-i18next";

import enLang from "./locales/en/en.json";
import frLang from "./locales/fr/fr.json";
import amhLang from "./locales/amh/amh.json";
// the translations
// (tip move them in a JSON file and import them,
// or even better, manage them separated from your code: https://react.i18next.com/guides/multiple-translation-files)
const resources = {
  en: {
    translation: {
      welcomeMessage: "Welcome to React and react-i18next",
      plularization_other: "You have {{count}} notifications",
      plularization_one: "You have {{count}} notification",
      enLang,
      ...enLang,
    }
  },
  fr: {
    translation: {
      welcomeMessage: "Bienvenue à React et react-i18next",
      plularization_other: "Vous avez {{count}} notifications",
      plularization_one: "Vous avez {{count}} notification",
      frLang,
      ...frLang,
    }
  },
  amh: {
    translation: {
      welcomeMessage: "ወደ React እና react-i18next እንኳን ደህና መጡ",
      plularization_other: "{{count}} ማሳወቂያዎች አሉዎት",
      plularization_one: "{{count}} ማሳወቂያ አለዎት",
      amhLang,
      ...amhLang,
    }
  }
};

i18n
  .use(initReactI18next) // passes i18n down to react-i18next
  .init({
    resources,
    fallbackLng: "en",
    lng: "en", // language to use, more information here: https://www.i18next.com/overview/configuration-options#languages-namespaces-resources
    // you can use the i18n.changeLanguage function to change the language manually: https://www.i18next.com/overview/api#changelanguage
    // if you're using a language detector, do not define the lng option

    interpolation: {
      escapeValue: false // react already safes from xss
    }
  });

  export default i18n;