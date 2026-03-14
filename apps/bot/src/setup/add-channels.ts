/**
 * Add missing channels to the Discord server.
 *
 * Usage:
 *   npx tsx apps/bot/src/setup/add-channels.ts
 *
 * This will:
 *   1. Create an "admin" role if it doesn't exist
 *   2. Create a COMMUNITY category with #general (verified users can chat)
 *   3. Create a COACHES category with #coach-lounge (coach-only)
 *   4. Update #verify with a button-based verification embed
 */

import {
  Client,
  GatewayIntentBits,
  ChannelType,
  PermissionFlagsBits,
  ButtonBuilder,
  ButtonStyle,
  ActionRowBuilder,
  EmbedBuilder,
  type Guild,
  type CategoryChannel,
} from 'discord.js';

const GUILD_ID = process.env.DISCORD_GUILD_ID ?? '';
const TOKEN = process.env.DISCORD_BOT_TOKEN ?? '';
const VERIFY_CHANNEL_ID = process.env.DISCORD_VERIFY_CHANNEL_ID ?? '';
const CLIENT_ROLE_ID = process.env.DISCORD_CLIENT_ROLE_ID ?? '';
const COACH_ROLE_ID = process.env.DISCORD_ADMIN_ROLE_ID ?? '';

if (!TOKEN || !GUILD_ID) {
  console.error('Missing DISCORD_BOT_TOKEN or DISCORD_GUILD_ID in env');
  process.exit(1);
}

const client = new Client({ intents: [GatewayIntentBits.Guilds] });

client.once('ready', async (readyClient) => {
  console.log(`[setup] Logged in as ${readyClient.user.tag}`);

  const guild = readyClient.guilds.cache.get(GUILD_ID);
  if (!guild) {
    console.error(`[setup] Guild ${GUILD_ID} not found`);
    process.exit(1);
  }

  try {
    await addChannels(guild);
  } catch (err) {
    console.error('[setup] Fatal error:', err);
  }

  process.exit(0);
});

async function addChannels(guild: Guild) {
  const everyone = guild.roles.everyone;

  // ── 1. Create COMMUNITY category with #general ──
  console.log('\n=== Creating COMMUNITY category ===');

  const communityCategory = await guild.channels.create({
    name: 'COMMUNITY',
    type: ChannelType.GuildCategory,
    permissionOverwrites: [
      { id: everyone.id, deny: [PermissionFlagsBits.ViewChannel] },
      { id: CLIENT_ROLE_ID, allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.SendMessages, PermissionFlagsBits.ReadMessageHistory] },
      { id: COACH_ROLE_ID, allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.SendMessages, PermissionFlagsBits.ReadMessageHistory, PermissionFlagsBits.ManageMessages] },
    ],
  }) as CategoryChannel;
  console.log(`  Created COMMUNITY category: ${communityCategory.id}`);

  const generalChannel = await guild.channels.create({
    name: 'general',
    type: ChannelType.GuildText,
    parent: communityCategory.id,
    topic: 'General chat for FlowState members',
  });
  console.log(`  Created #general: ${generalChannel.id}`);

  await generalChannel.send({
    embeds: [{
      title: 'Welcome to General Chat',
      description: 'This is the community space for all verified FlowState members. Share wins, ask questions, and support each other on the journey.',
      color: 0x0fa884,
    }],
  });

  // ── 2. Create COACHES category with #coach-lounge ──
  console.log('\n=== Creating COACHES category ===');

  const coachCategory = await guild.channels.create({
    name: 'COACHES',
    type: ChannelType.GuildCategory,
    permissionOverwrites: [
      { id: everyone.id, deny: [PermissionFlagsBits.ViewChannel] },
      { id: COACH_ROLE_ID, allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.SendMessages, PermissionFlagsBits.ReadMessageHistory, PermissionFlagsBits.ManageMessages] },
    ],
  }) as CategoryChannel;
  console.log(`  Created COACHES category: ${coachCategory.id}`);

  const coachLounge = await guild.channels.create({
    name: 'coach-lounge',
    type: ChannelType.GuildText,
    parent: coachCategory.id,
    topic: 'Private space for coaches to discuss clients and strategies',
  });
  console.log(`  Created #coach-lounge: ${coachLounge.id}`);

  await coachLounge.send({
    embeds: [{
      title: 'Coach Lounge',
      description: 'Private space for coaches. Discuss client progress, strategies, and coordination here.',
      color: 0x0fa884,
    }],
  });

  // ── 3. Update #verify channel with button-based verification ──
  if (VERIFY_CHANNEL_ID) {
    console.log('\n=== Updating #verify with button verification ===');

    const verifyChannel = await guild.channels.fetch(VERIFY_CHANNEL_ID);
    if (verifyChannel && verifyChannel.isTextBased()) {
      // Delete old messages in verify channel
      const messages = await verifyChannel.messages.fetch({ limit: 50 });
      for (const [, msg] of messages) {
        await msg.delete().catch(() => {});
      }

      // Send new embed with verify button
      const verifyEmbed = new EmbedBuilder()
        .setColor(0x0fa884)
        .setTitle('✅ Verify Your Account')
        .setDescription(
          'Welcome to FlowState! Click the button below to verify your account.\n\n' +
          'You\'ll need the **verification code** that was sent to your email when your coach approved your application.'
        )
        .setFooter({ text: 'FlowState Coaching' });

      const verifyButton = new ButtonBuilder()
        .setCustomId('flowstate_verify')
        .setLabel('Verify Account')
        .setStyle(ButtonStyle.Success)
        .setEmoji('✅');

      const row = new ActionRowBuilder<ButtonBuilder>().addComponents(verifyButton);

      await verifyChannel.send({
        embeds: [verifyEmbed],
        components: [row],
      });

      console.log('  Updated #verify with button-based verification');
    }
  }

  // ── PRINT SUMMARY ──
  console.log('\n═══════════════════════════════════════════════');
  console.log('  CHANNELS ADDED SUCCESSFULLY');
  console.log('═══════════════════════════════════════════════\n');
  console.log(`DISCORD_GENERAL_CHANNEL_ID=${generalChannel.id}`);
  console.log(`DISCORD_COACH_LOUNGE_CHANNEL_ID=${coachLounge.id}`);
  console.log('');
}

client.login(TOKEN);
