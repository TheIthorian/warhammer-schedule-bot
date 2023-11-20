import { RollCommand } from './roll';
import { jobScheduler } from './../scheduling/index';
import { DateParser } from './../util/date-parser';
import { BookCommand } from './book';
import { AsciiPollResultsFormatter } from './../scheduling/ascii-poll-results-formatter';
import { PartyScheduler } from './../scheduling/party-scheduler';
import { ScheduleCommand } from './schedule';
import { linearSpamProtection } from './../spam';
import { CommandInteractionRouter } from './router';
import { PingCommand } from './ping';
import { Command } from './types';

const dateParser = new DateParser();
const partyScheduler = new PartyScheduler();
const pollResultsFormatter = new AsciiPollResultsFormatter();

export const commands: Array<Command> = [
    new PingCommand(),
    new ScheduleCommand(partyScheduler, pollResultsFormatter),
    new BookCommand(jobScheduler, dateParser),
    new RollCommand(),
];
export const commandInteractionRouter = new CommandInteractionRouter(commands, linearSpamProtection);
