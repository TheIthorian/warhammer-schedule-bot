import { ScheduleCommand } from './schedule';
import { linearSpamProtection } from './../spam';
import { CommandInteractionRouter } from './router';
import { PingCommand } from './ping';
import { Command } from './types';

export const commands: Array<Command> = [new PingCommand(), new ScheduleCommand()];
export const commandInteractionRouter = new CommandInteractionRouter(commands, linearSpamProtection);
