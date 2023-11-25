import { DateParser } from '../../util/date-parser';
import { ReminderService } from './reminder.service';

const dateParser = new DateParser();

export const reminderService = new ReminderService(dateParser);
