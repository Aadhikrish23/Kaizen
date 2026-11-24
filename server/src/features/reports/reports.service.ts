import { loadAggregate } from './aggregate.service';
import { todayInTz } from '../../utils/dates';
import { AppError } from '../../middleware/errorHandler';
import { buildReport, PERIOD_DAYS, ReportPeriod } from './reports.logic';

export const getReport = async (user: any, period: ReportPeriod, date?: string) => {
  const today = todayInTz(user.timezone);
  const endDate = date ?? today;
  if (endDate > today) throw new AppError(400, 'VALIDATION_ERROR', 'date cannot be in the future');
  const aggregate = await loadAggregate(user, endDate, PERIOD_DAYS[period]);
  return buildReport(period, aggregate);
};
