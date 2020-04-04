import dotenv from 'dotenv';

dotenv.config();

export default {
	token: process.env.DISCORD_TOKEN as string,
	prefix: process.env.DISCORD_PREFIX as string,
	noQueueDisconnection: false,
	disconnectionTime: Number.parseInt(process.env.DISCONNECTION_TIME as string),
	searchTime: 30,
};