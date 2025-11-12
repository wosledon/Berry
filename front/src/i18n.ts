import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';

const resources = {
  en: {
    translation: {
      'Dashboard': 'Dashboard',
      'Users': 'Users',
      'Roles': 'Roles',
      'Permissions': 'Permissions',
      'Audit Logs': 'Audit Logs',
      'Create': 'Create',
      'Edit': 'Edit',
      'Detail': 'Detail',
      'Profile': 'Profile',
      'Logout': 'Logout',
      'Tenant': 'Tenant',
      'Light': 'Light',
      'Dark': 'Dark',
      'Color': 'Color',
      'Sensitive': 'Sensitive',
      'Account': 'Account',
      'Personal Center': 'Personal Center',
      'Switch Theme': 'Switch Theme',
      'Switch Color': 'Switch Color',
      'Switch Language': 'Switch Language',
    }
  },
  zh: {
    translation: {
      'Dashboard': '工作台',
      'Users': '用户',
      'Roles': '角色',
      'Permissions': '权限',
      'Audit Logs': '审计日志',
      'Create': '新建',
      'Edit': '编辑',
      'Detail': '详情',
      'Profile': '个人中心',
      'Logout': '退出登录',
      'Tenant': '租户',
      'Light': '浅色',
      'Dark': '深色',
      'Color': '主题色',
      'Sensitive': '敏感模式',
      'Account': '账户',
      'Personal Center': '个人中心',
      'Switch Theme': '切换主题',
      'Switch Color': '切换颜色',
      'Switch Language': '切换语言',
    }
  }
};

i18n.use(initReactI18next).init({
  resources,
  lng: 'zh',
  fallbackLng: 'zh',
  interpolation: { escapeValue: false }
});

export default i18n;
