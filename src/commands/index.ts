import { RollCommand } from './roll';
import { BookCommand } from './book';
import { AsciiPollResultsFormatter } from './../scheduling/ascii-poll-results-formatter';
import { PartyScheduler } from './../scheduling/party-scheduler';
import { ScheduleCommand } from './schedule';
import { linearSpamProtection } from './../spam';
import { CommandInteractionRouter } from './router';
import { PingCommand } from './ping';
import { Command } from './types';
import { reminderService } from '../services/reminder';
import { RollService } from '../services/roll';

const partyScheduler = new PartyScheduler();
const pollResultsFormatter = new AsciiPollResultsFormatter();

export const commands: Array<Command> = [
    new PingCommand(),
    new ScheduleCommand(partyScheduler, pollResultsFormatter),
    new BookCommand(reminderService),
    new RollCommand(new RollService()),
];
export const commandInteractionRouter = new CommandInteractionRouter(commands, linearSpamProtection);
