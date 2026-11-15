// Opt-in browser notifications. Permission is only requested from an explicit user click (enableBrowserNotifications).
const FLAG = 'kaizen_browser_notifications';

const supported = () => typeof window !== 'undefined' && 'Notification' in window;

const readFlag = (): boolean => {
  try {
    return window.localStorage.getItem(FLAG) === '1';
  } catch {
    return false;
  }
};

const writeFlag = (on: boolean) => {
  try {
    window.localStorage.setItem(FLAG, on ? '1' : '0');
  } catch {
    /* ignore */
  }
};

export const browserNotificationsSupported = supported;

/** True when the user opted in and the browser permission is granted. */
export const browserNotificationsActive = (): boolean => supported() && readFlag() && Notification.permission === 'granted';

export type EnableResult = 'enabled' | 'denied' | 'unsupported';

/** Call only from a click handler: this is the single place that asks the browser for permission. */
export const enableBrowserNotifications = async (): Promise<EnableResult> => {
  if (!supported()) return 'unsupported';
  try {
    const permission = Notification.permission === 'granted' ? 'granted' : await Notification.requestPermission();
    if (permission === 'granted') {
      writeFlag(true);
      return 'enabled';
    }
  } catch {
    /* some browsers throw outside a user gesture */
  }
  writeFlag(false);
  return 'denied';
};

export const disableBrowserNotifications = () => writeFlag(false);

export const showBrowserNotification = (title: string, body: string) => {
  try {
    if (browserNotificationsActive()) new Notification(title, { body });
  } catch {
    /* ignore: the in-app banner is the primary channel */
  }
};
