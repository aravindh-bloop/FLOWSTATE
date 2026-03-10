import path from 'node:path';
import { fileURLToPath } from 'node:url';

import dotenv from 'dotenv';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.join(__dirname, '../.env.local') });
dotenv.config({ path: path.join(__dirname, '../.env') }); // Fallback

const botToken = process.env.DISCORD_BOT_TOKEN;
const guildId = process.env.DISCORD_GUILD_ID;
const adminRoleId = process.env.DISCORD_ADMIN_ROLE_ID;

if (!botToken || !guildId) {
  console.error(
    'Missing DISCORD_BOT_TOKEN or DISCORD_GUILD_ID in env array! Exiting.'
  );
  process.exit(1);
}

const API_BASE = 'https://discord.com/api/v10';

interface ChannelConfig {
  name: string;
  type: number; // 0 for Text, 2 for Voice, 4 for Category
  permission_overwrites?: any[];
}

interface CategoryConfig extends ChannelConfig {
  channels: ChannelConfig[];
}

const everyoneDenySend = [
  { id: guildId, type: 0, deny: '2048' }, // 2048 = SEND_MESSAGES
];

const adminAllowSend = adminRoleId
  ? [
      ...everyoneDenySend,
      { id: adminRoleId, type: 0, allow: '2048' }, // Admin can send
    ]
  : everyoneDenySend;

const structure: CategoryConfig[] = [
  {
    name: '📋 START HERE',
    type: 4,
    channels: [
      { name: 'welcome', type: 0 },
      { name: 'rules-and-etiquette', type: 0 },
      { name: 'how-this-works', type: 0 },
    ],
  },
  {
    name: '📣 ANNOUNCEMENTS',
    type: 4,
    channels: [
      { name: 'announcements', type: 0, permission_overwrites: adminAllowSend },
      {
        name: 'weekly-insights',
        type: 0,
        permission_overwrites: adminAllowSend,
      },
      {
        name: 'program-updates',
        type: 0,
        permission_overwrites: adminAllowSend,
      },
    ],
  },
  {
    name: '🏛️ COMMUNITY',
    type: 4,
    channels: [
      { name: 'introductions', type: 0 },
      { name: 'wins-and-breakthroughs', type: 0 },
      { name: 'accountability-check', type: 0 },
      { name: 'off-topic', type: 0 },
    ],
  },
  {
    name: '📚 RESOURCES',
    type: 4,
    channels: [
      { name: 'deep-work-tools', type: 0 },
      { name: 'sleep-and-recovery', type: 0 },
      { name: 'dopamine-and-focus', type: 0 },
      { name: 'book-and-podcast-recs', type: 0 },
      { name: 'weekly-challenge', type: 0 },
    ],
  },
  {
    name: '🔬 SCIENCE DESK',
    type: 4,
    channels: [
      { name: 'research-drops', type: 0 },
      { name: 'ask-an-admin', type: 0 },
    ],
  },
  {
    name: '🎙️ VOICE LOUNGES',
    type: 4,
    channels: [
      { name: 'Deep Work Room', type: 2 },
      { name: 'Open Floor', type: 2 },
      { name: 'Admin Office Hours', type: 2 },
    ],
  },
];

async function createChannel(config: any): Promise<any> {
  const res = await fetch(`${API_BASE}/guilds/${guildId}/channels`, {
    method: 'POST',
    headers: {
      Authorization: `Bot ${botToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(config),
  });

  if (!res.ok) {
    const text = await res.text();
    console.error(`Failed to create ${config.name}:`, text);
    throw new Error(`Failed to create ${config.name}`);
  }

  return res.json();
}

async function run() {
  console.log('Starting Discord setup...');

  for (const cat of structure) {
    console.log(`\nCreating Category: ${cat.name}`);
    try {
      const createdCat = await createChannel({
        name: cat.name,
        type: cat.type,
      });

      for (const ch of cat.channels) {
        console.log(`  -> Creating Channel: ${ch.name}`);
        await createChannel({
          name: ch.name,
          type: ch.type,
          parent_id: createdCat.id,
          permission_overwrites: ch.permission_overwrites,
        });
      }
    } catch (e) {
      console.error(e);
    }
  }

  console.log('\n✅ Setup Complete!');
}

run().catch(console.error);
