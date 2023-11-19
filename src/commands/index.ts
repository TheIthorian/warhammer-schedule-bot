import { PartyScheduler } from './../scheduling/party-scheduler';
import { ScheduleCommand } from './schedule';
import { linearSpamProtection } from './../spam';
import { CommandInteractionRouter } from './router';
import { PingCommand } from './ping';
import { Command } from './types';

const partyScheduler = new PartyScheduler();
export const commands: Array<Command> = [new PingCommand(), new ScheduleCommand(partyScheduler)];
export const commandInteractionRouter = new CommandInteractionRouter(commands, linearSpamProtection);
