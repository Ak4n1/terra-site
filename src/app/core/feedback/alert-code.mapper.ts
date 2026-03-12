import type { AlertVariant } from '../../shared/ui/atoms/alert/alert.component';

const ALERT_VARIANT_BY_STATUS: Partial<Record<number, AlertVariant>> = {
  400: 'warning',
  401: 'error',
  403: 'warning',
  404: 'error',
  409: 'warning',
  422: 'warning',
  429: 'warning'
};

export function resolveAlertVariant(status: number): AlertVariant {
  const customVariant = ALERT_VARIANT_BY_STATUS[status];
  if (customVariant) {
    return customVariant;
  }

  if (status >= 200 && status < 300) {
    return 'success';
  }

  if (status >= 400 && status < 500) {
    return 'error';
  }

  if (status === 0 || status >= 500) {
    return 'error';
  }

  return 'warning';
}
