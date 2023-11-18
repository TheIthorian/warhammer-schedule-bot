import { Interaction } from 'discord.js';

export interface InteractionRouter {
    handle(interaction: Interaction): Promise<void>; // TODO - rename to route
}
