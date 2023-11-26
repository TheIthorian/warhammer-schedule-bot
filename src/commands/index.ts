import { RollCommand } from './roll';
import { BookCommand } from './book';
import { AsciiPollResultsFormatter } from './../scheduling/ascii-poll-results-formatter';
import { PollService } from '../services/poll-service';
import { ScheduleCommand } from './schedule';
import { linearSpamProtection } from './../spam';
import { CommandInteractionRouter } from './router';
import { PingCommand } from './ping';
import { Command } from './types';
import { reminderService } from '../services/reminder';
import { RollService } from '../services/roll';
import { guildConnectionService } from '../services/guild-connection';
import { ScheduleService } from '../scheduling/schedule-service';
import { client } from '../discord-client';

const pollService = new PollService();
const pollResultsFormatter = new AsciiPollResultsFormatter();

const scheduleService = new ScheduleService(pollService, client);

export const commands: Array<Command> = [
    new PingCommand(),
    new ScheduleCommand(pollService, pollResultsFormatter, guildConnectionService, scheduleService),
    new BookCommand(reminderService),
    new RollCommand(new RollService()),
];
export const commandInteractionRouter = new CommandInteractionRouter(commands, linearSpamProtection);
