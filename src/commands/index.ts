import { RollCommand } from './roll';
import { BookCommand } from './book';
import { pollService } from '../services/poll.service';
import { ScheduleCommand } from './schedule';
import { linearSpamProtection } from './../spam';
import { CommandInteractionRouter } from './router';
import { PingCommand } from './ping';
import { Command } from './types';
import { reminderService } from '../services/reminder.service';
import { rollService } from '../services/roll.service';
import { scheduleService } from '../scheduling/schedule-service';
import { QueryCommand } from './query';
import { queryService } from '../services/query.service';

export const commands: Array<Command> = [
    new PingCommand(),
    new ScheduleCommand(pollService, scheduleService),
    new BookCommand(reminderService),
    new RollCommand(rollService),
    new QueryCommand(queryService),
];
export const commandInteractionRouter = new CommandInteractionRouter(commands, linearSpamProtection);
