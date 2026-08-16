import assert from 'node:assert/strict';
import test from 'node:test';
import { buildInboxPersistencePlan, normalizeMetaConversation } from './sales-inbox';

test('normalizes and sorts a real Meta conversation', () => {
  const conversation = normalizeMetaConversation({
    id: 'conversation-1',
    updated_time: '2026-08-16T09:00:00.000Z',
    participants: {
      data: [
        { id: 'page-1', name: 'MayDo' },
        { id: 'customer-1', name: 'Nguyễn Thu Hà' },
      ],
    },
    messages: {
      data: [
        {
          id: 'message-2',
          message: 'Dạ bên em nhận may chị nhé',
          created_time: '2026-08-16T09:00:00.000Z',
          from: { id: 'page-1', name: 'MayDo' },
        },
        {
          id: 'message-1',
          message: 'Mẫu này còn nhận may không?',
          created_time: '2026-08-16T08:55:00.000Z',
          from: { id: 'customer-1', name: 'Nguyễn Thu Hà' },
        },
      ],
    },
  }, 'facebook', {
    token: 'not-used-by-normalizer',
    pageId: 'page-1',
    pageName: 'MayDo',
  });

  assert.ok(conversation);
  assert.equal(conversation.customer.name, 'Nguyễn Thu Hà');
  assert.equal(conversation.messages[0].direction, 'inbound');
  assert.equal(conversation.messages[1].direction, 'outbound');
  assert.equal(conversation.lastMessage, 'Dạ bên em nhận may chị nhé');
});

test('uses an attachment label without inventing message content', () => {
  const conversation = normalizeMetaConversation({
    id: 'conversation-2',
    participants: { data: [{ id: 'customer-2', name: 'Trần Ngọc Mai' }] },
    messages: {
      data: [{
        id: 'message-3',
        created_time: '2026-08-16T10:00:00.000Z',
        from: { id: 'customer-2', name: 'Trần Ngọc Mai' },
        attachments: { data: [{ type: 'image' }] },
      }],
    },
  }, 'instagram', {
    token: 'not-used-by-normalizer',
    pageId: 'page-2',
    pageName: 'MayDo Instagram',
    businessAccountId: 'ig-1',
  });

  assert.ok(conversation);
  assert.equal(conversation.lastMessage, 'Tệp đính kèm');
  assert.equal(conversation.messages[0].hasAttachment, true);
});

test('builds stable upsert keys and never schedules deletes', () => {
  const plan = buildInboxPersistencePlan({
    id: 'facebook-conversation-10',
    externalId: 'conversation-10',
    platform: 'facebook',
    customer: { id: 'customer-10', name: 'Lê Thanh Tú', phone: '' },
    lastMessage: 'Mình muốn đặt mẫu này',
    updatedAt: '2026-08-16T07:00:00.000Z',
    unreadCount: 0,
    messages: [
      {
        id: 'message-10',
        text: 'Mình muốn đặt mẫu này',
        sentAt: '2026-08-16T07:00:00.000Z',
        direction: 'inbound',
        senderName: 'Lê Thanh Tú',
        hasAttachment: false,
      },
      {
        id: 'message-10',
        text: 'Mình muốn đặt mẫu này nhé',
        sentAt: '2026-08-16T07:00:01.000Z',
        direction: 'inbound',
        senderName: 'Lê Thanh Tú',
        hasAttachment: false,
      },
    ],
  });

  assert.equal(plan.conversationKey.platform, 'facebook');
  assert.equal(plan.conversationKey.externalId, 'conversation-10');
  assert.equal(plan.messages.length, 1);
  assert.equal(plan.messages[0].externalId, 'message-10');
  assert.equal(plan.messages[0].text, 'Mình muốn đặt mẫu này nhé');
  assert.equal(plan.deleteMissing, false);
});
