import {
  EmbedBuilder,
  ModalBuilder,
  TextInputBuilder,
  TextInputStyle,
  ActionRowBuilder,
} from 'discord.js';
import type {
  Message,
  ButtonInteraction,
  ModalSubmitInteraction,
} from 'discord.js';
import { verifyClient } from '../api.js';

const UNVERIFIED_ROLE_ID = process.env.DISCORD_UNVERIFIED_ROLE_ID ?? '';
const CLIENT_ROLE_ID = process.env.DISCORD_CLIENT_ROLE_ID ?? '';

/**
 * Legacy text-based verification handler.
 * Kept as fallback — handles `!register CODE` messages in #verify.
 * Auto-deletes messages to keep the channel clean.
 */
export async function handleVerification(message: Message) {
  const channel = message.channel;
  if (!channel.isSendable()) return;

  const content = message.content.trim();

  // Delete ANY user message in #verify for cleanliness (not just !register)
  const deleteTimeout = setTimeout(() => {
    message.delete().catch(() => {});
  }, 500);

  if (!content.startsWith('!register')) {
    // Not a register command — just clean up silently
    return;
  }

  clearTimeout(deleteTimeout);
  // Delete immediately for register commands
  await message.delete().catch(() => {});

  const parts = content.split(' ');
  const code = parts[1];

  if (!code) {
    const reply = await channel.send({
      content: `<@${message.author.id}> Please use the **Verify Account** button above, or type \`!register YOUR-CODE\``,
    });
    setTimeout(() => reply.delete().catch(() => {}), 10000);
    return;
  }

  try {
    const result = await verifyClient(
      message.author.id,
      message.author.username,
      code
    );

    if (result.success) {
      const member = await message.guild?.members.fetch(message.author.id);

      if (member) {
        if (UNVERIFIED_ROLE_ID) await member.roles.remove(UNVERIFIED_ROLE_ID).catch(console.error);
        if (CLIENT_ROLE_ID) await member.roles.add(CLIENT_ROLE_ID).catch(console.error);
      }

      const embed = new EmbedBuilder()
        .setColor(0x0fa884)
        .setTitle('✅ Verification Successful!')
        .setDescription(`Welcome to FlowState, **${result.full_name}**!\n\nYour private check-in channels have been created. Look for channels with your name in the sidebar.`)
        .setTimestamp();

      const successMsg = await channel.send({
        content: `<@${message.author.id}>`,
        embeds: [embed],
      });
      // Auto-delete success message after 30 seconds
      setTimeout(() => successMsg.delete().catch(() => {}), 30000);

      console.log(`[bot] Client ${result.full_name} verified via text command.`);
    } else {
      const reply = await channel.send({
        content: `❌ <@${message.author.id}> ${result.error || 'Verification failed. Check your code and try again.'}`,
      });
      setTimeout(() => reply.delete().catch(() => {}), 15000);
    }
  } catch (err) {
    console.error('[bot] Verification error:', err);
    const reply = await channel.send({
      content: `❌ <@${message.author.id}> An error occurred. Please try again or contact your coach.`,
    });
    setTimeout(() => reply.delete().catch(() => {}), 15000);
  }
}

/**
 * Button click handler — shows the verification modal.
 * Triggered when user clicks the "Verify Account" button in #verify.
 */
export async function handleVerifyButton(interaction: ButtonInteraction) {
  if (interaction.customId !== 'flowstate_verify' && interaction.customId !== 'verify_account_button') return;

  try {
    const modal = new ModalBuilder()
      .setCustomId('flowstate_verify_modal')
      .setTitle('FlowState Verification');

    const codeInput = new TextInputBuilder()
      .setCustomId('verification_code')
      .setLabel('Enter your verification code')
      .setPlaceholder('e.g. ABC123XYZ')
      .setStyle(TextInputStyle.Short)
      .setRequired(true)
      .setMinLength(3)
      .setMaxLength(50);

    const row = new ActionRowBuilder<TextInputBuilder>().addComponents(codeInput);
    modal.addComponents(row);

    await interaction.showModal(modal);
    console.log(`[bot] Verification modal shown to ${interaction.user.username}`);
  } catch (err: any) {
    console.error('[bot] Failed to show verification modal:', err.message);
    // If modal failed (e.g. interaction expired), try ephemeral reply as fallback
    try {
      if (!interaction.replied && !interaction.deferred) {
        await interaction.reply({
          content: '⚠️ The verification popup could not be shown (timeout). Please try clicking the button again, or type `!register YOUR-CODE` in this channel.',
          ephemeral: true,
        });
      }
    } catch {
      // Both failed — interaction fully expired, nothing we can do
      console.error('[bot] Interaction fully expired — user should retry');
    }
  }
}

/**
 * Modal submit handler — processes the verification code.
 * Triggered when user submits the verification modal.
 */
export async function handleVerifyModal(interaction: ModalSubmitInteraction) {
  if (interaction.customId !== 'flowstate_verify_modal') return;

  const code = interaction.fields.getTextInputValue('verification_code').trim();

  if (!code) {
    await interaction.reply({
      content: '❌ Please enter a valid verification code.',
      ephemeral: true,
    });
    return;
  }

  // Use flags instead of ephemeral option for deferReply
  await interaction.deferReply({ ephemeral: true });

  try {
    const result = await verifyClient(
      interaction.user.id,
      interaction.user.username,
      code
    );

    if (result.success) {
      const member = await interaction.guild?.members.fetch(interaction.user.id);

      if (member) {
        if (UNVERIFIED_ROLE_ID) await member.roles.remove(UNVERIFIED_ROLE_ID).catch(console.error);
        if (CLIENT_ROLE_ID) await member.roles.add(CLIENT_ROLE_ID).catch(console.error);
      }

      const embed = new EmbedBuilder()
        .setColor(0x0fa884)
        .setTitle('✅ Verification Successful!')
        .setDescription(
          `Welcome to FlowState, **${result.full_name}**!\n\n` +
          `Your private check-in channels have been created.\n` +
          `Look for channels with your name in the sidebar.\n\n` +
          `**Next steps:**\n` +
          `• Send your first morning check-in photo in your channel\n` +
          `• Check out #general to meet other members`
        )
        .setTimestamp();

      await interaction.editReply({ embeds: [embed] });
      console.log(`[bot] Client ${result.full_name} verified via button modal.`);
    } else {
      await interaction.editReply({
        content: `❌ ${result.error || 'Verification failed. Please check your code and try again.'}`,
      });
    }
  } catch (err: any) {
    console.error('[bot] Modal verification error:', err?.message ?? err);

    // Extract meaningful error message from API response if possible
    // botFetch throws: "API 404 /api/bot/verify: {"success":false,"error":"..."}"
    let userMessage = 'An error occurred during verification. Please try again or contact your coach.';
    const errMsg = err?.message ?? '';
    try {
      const jsonMatch = errMsg.match(/\{.*\}/);
      if (jsonMatch) {
        const parsed = JSON.parse(jsonMatch[0]);
        if (parsed.error) userMessage = parsed.error;
      }
    } catch {
      // Couldn't parse — use default message
    }

    await interaction.editReply({
      content: `❌ ${userMessage}`,
    });
  }
}
