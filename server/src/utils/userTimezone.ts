import User from '../features/auth/User';
import { DEFAULT_TIMEZONE, isValidTimezone, todayInTz } from './dates';

export const getUserTimezone = async (userId: unknown): Promise<string> => {
  const user: any = await User.findById(userId).select('timezone').lean();
  return isValidTimezone(user?.timezone) ? user.timezone : DEFAULT_TIMEZONE;
};

/** Today's calendar date in the user's timezone. */
export const todayForUser = async (userId: unknown): Promise<string> => todayInTz(await getUserTimezone(userId));
