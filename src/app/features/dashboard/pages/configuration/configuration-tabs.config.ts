import type { MaskButtonMask } from '../../../../shared/ui/atoms/mask-button/mask-button.component';

export type ConfigurationTabKey = 'profile' | 'security' | 'activity' | 'notifications';

export type ConfigurationTab = {
  key: ConfigurationTabKey;
  route: string;
  labelKey: string;
  mask: MaskButtonMask;
};

export const CONFIGURATION_TABS: ReadonlyArray<ConfigurationTab> = [
  {
    key: 'profile',
    route: '/dashboard/configuration/profile',
    labelKey: 'dashboardConfigurationTabProfile',
    mask: 5
  },
  {
    key: 'security',
    route: '/dashboard/configuration/security',
    labelKey: 'dashboardConfigurationTabSecurity',
    mask: 3
  },
  {
    key: 'notifications',
    route: '/dashboard/configuration/notifications',
    labelKey: 'dashboardConfigurationTabNotifications',
    mask: 4
  },
  {
    key: 'activity',
    route: '/dashboard/configuration/activity',
    labelKey: 'dashboardConfigurationTabActivity',
    mask: 2
  }
];
