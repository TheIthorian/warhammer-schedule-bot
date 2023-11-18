import { Client, GatewayIntentBits } from 'discord.js';
import { config } from './config';

export async function start() {
    const client = new Client({ intents: [GatewayIntentBits.Guilds] });

    client.on('ready', () => {
        console.log(`Logged in as ${client.user?.tag}!`);
    });

    client.on('interactionCreate', async interaction => {
        if (!interaction.isChatInputCommand()) return;

        if (interaction.commandName === 'ping') {
            await interaction.reply('Pong!');
        }
    });

    client.login(config.botToken);
}
