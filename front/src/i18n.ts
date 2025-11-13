import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';

// 配置化加载：从 JSON 文件导入（也可以换成 i18next-http-backend 动态加载）
import enUs from './locales/enUs.json';
import zhCn from './locales/zhCn.json';

const resources = {
  en: { translation: enUs },
  zh: { translation: zhCn }
};

i18n.use(initReactI18next).init({
  resources,
  lng: 'zh',
  fallbackLng: 'zh',
  interpolation: { escapeValue: false }
});

export default i18n;
