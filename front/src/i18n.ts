import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';

const resources = {
  en: {
    translation: {
      'Dashboard': 'Dashboard',
      'menu.dashboard': 'Dashboard',
      'menu.system': 'System Config',
      'menu.users': 'Users',
      'menu.roles': 'Roles',
      'menu.permissions': 'Permissions',
      'menu.audits': 'Audit Logs',
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
      'Theme Settings': 'Theme Settings',
      'Color Preset': 'Color Preset',
      'Layout Style': 'Layout Style',
      'Layout Mode': 'Layout Mode',
      'Notification Placement': 'Notification Placement',
      'Side': 'Side',
      'Top': 'Top',
      'Mix': 'Mix',
      'Preview': 'Preview',
      'Primary Color': 'Primary Color',
      'Sample Button': 'Sample Button',
      'Card Padding': 'Card Padding',
    }
  },
  zh: {
    translation: {
      'Dashboard': '工作台',
      'menu.dashboard': '工作台',
      'menu.system': '系统配置',
      'menu.users': '用户',
      'menu.roles': '角色',
      'menu.permissions': '权限',
      'menu.audits': '审计日志',
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
      'Theme Settings': '主题设置',
      'Color Preset': '颜色预设',
      'Layout Style': '布局密度',
      'Layout Mode': '布局模式',
      'Notification Placement': '通知位置',
      'Side': '侧栏',
      'Top': '顶部',
      'Mix': '混合',
      'Preview': '实时预览',
      'Primary Color': '主色',
      'Sample Button': '示例按钮',
      'Card Padding': '卡片内边距',
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
