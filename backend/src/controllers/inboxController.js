/**
 * @module controllers/inboxController
 * @description Unified Inbox actions.
 */

import prisma from '../lib/prisma.js';
import { decrypt } from '../lib/crypto.js';
import { sendDirectMessage } from '../services/unipileClient.js';

/**
 * Lists conversations for the current user.
 */
export async function listConversations(req, res, next) {
  try {
    const conversations = await prisma.conversation.findMany({
      where: { userId: req.user.id },
      include: {
        linkedAccount: { select: { label: true } },
      },
      orderBy: { lastMessageAt: 'desc' },
    });
    return res.status(200).json({ data: conversations });
  } catch (err) {
    next(err);
  }
}

/**
 * Lists messages for a conversation.
 */
export async function listMessages(req, res, next) {
  try {
    const { id } = req.params;
    const conversation = await prisma.conversation.findUnique({
      where: { id },
    });
    if (!conversation || conversation.userId !== req.user.id) {
      return res.status(404).json({ error: 'Conversation not found', code: 404 });
    }
    const messages = await prisma.message.findMany({
      where: { conversationId: id },
      orderBy: { createdAt: 'asc' },
    });
    return res.status(200).json({ data: messages });
  } catch (err) {
    next(err);
  }
}

/**
 * Sends a reply to a conversation.
 */
export async function replyToConversation(req, res, next) {
  try {
    const { id } = req.params;
    const { text } = req.body;
    if (!text) {
      return res.status(400).json({ error: 'text is required', code: 400 });
    }

    const conversation = await prisma.conversation.findUnique({
      where: { id },
      include: { linkedAccount: true },
    });

    if (!conversation || conversation.userId !== req.user.id) {
      return res.status(404).json({ error: 'Conversation not found', code: 404 });
    }

    const decryptedToken = decrypt(conversation.linkedAccount.accessToken);
    const { unipileDsn, accountId } = conversation.linkedAccount;

    // Send DM via Unipile
    const sendResult = await sendDirectMessage(
      unipileDsn,
      decryptedToken,
      accountId,
      conversation.unipileChatId,
      text
    );
    
    // Create the message in our DB immediately
    const savedMessage = await prisma.message.create({
      data: {
        conversationId: conversation.id,
        unipileMessageId: sendResult?.id || `msg-\${Date.now()}`,
        text,
        isFromMe: true,
      },
    });

    await prisma.conversation.update({
      where: { id: conversation.id },
      data: { lastMessageAt: new Date() },
    });

    return res.status(201).json({ data: savedMessage });
  } catch (err) {
    next(err);
  }
}
