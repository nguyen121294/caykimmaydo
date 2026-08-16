import { prisma } from '@/lib/prisma';
import { decrypt } from '@/lib/crypto';
import type {
  SalesInboxConversation,
  SalesInboxMessage,
  SalesInboxPlatform,
  SalesInboxPlatformStatus,
  SalesInboxResponse,
} from '@/lib/sales-inbox-types';
import { SALES_INBOX_PLATFORMS } from '@/lib/sales-inbox-types';

const GRAPH_VERSION = process.env.META_GRAPH_VERSION || 'v19.0';
const GRAPH_ROOT = `https://graph.facebook.com/${GRAPH_VERSION}`;

interface StoredCredential {
  token?: string;
  userToken?: string;
  pageAccessToken?: string;
  pageId?: string;
  pageName?: string;
  igAccountId?: string;
}

interface MetaContext {
  token: string;
  pageId: string;
  pageName: string;
  businessAccountId?: string;
}

interface MetaMessage {
  id?: string;
  message?: string;
  created_time?: string;
  from?: { id?: string; name?: string };
  attachments?: { data?: unknown[] };
}

interface MetaConversation {
  id?: string;
  updated_time?: string;
  participants?: { data?: Array<{ id?: string; name?: string; email?: string }> };
  messages?: { data?: MetaMessage[] };
}

const platformLabels: Record<SalesInboxPlatform, string> = {
  facebook: 'Facebook',
  instagram: 'Instagram',
  zalo: 'Zalo',
  tiktok: 'TikTok',
  manychat: 'ManyChat',
  telegram: 'Telegram',
};

function cleanProviderError(error: unknown): string {
  const message = error instanceof Error ? error.message : '';
  if (message.includes('permission') || message.includes('Permissions')) {
    return 'Tài khoản đã kết nối nhưng chưa được cấp quyền đọc tin nhắn.';
  }
  if (message.includes('token') || message.includes('OAuth')) {
    return 'Phiên kết nối đã hết hạn. Hãy kết nối lại tài khoản.';
  }
  return 'Không thể đọc tin nhắn lúc này. Hãy kiểm tra kết nối và quyền truy cập.';
}

async function readCredential(platform: string): Promise<StoredCredential | null> {
  const credential = await prisma.platformCredential.findUnique({ where: { platform } });
  if (!credential?.isConnected || !credential.credentials) return null;

  try {
    const parsed = JSON.parse(decrypt(credential.credentials));
    if (parsed?.type !== 'live') return null;
    return parsed as StoredCredential;
  } catch {
    return null;
  }
}

async function resolveFacebookContext(): Promise<MetaContext | null> {
  const stored = await readCredential('Facebook Page');
  const token = stored?.pageAccessToken || stored?.token || stored?.userToken;
  if (!stored || !token) return null;

  if (stored.pageId) {
    return {
      token,
      pageId: stored.pageId,
      pageName: stored.pageName || 'MayDo Facebook',
    };
  }

  const response = await fetch(
    `${GRAPH_ROOT}/me/accounts?fields=id,name,access_token&limit=100&access_token=${encodeURIComponent(token)}`,
    { signal: AbortSignal.timeout(12_000), cache: 'no-store' },
  );
  const payload = await response.json();
  if (!response.ok || payload?.error || !payload?.data?.[0]) {
    throw new Error(payload?.error?.message || 'Facebook token error');
  }

  const page = payload.data[0];
  return {
    token: page.access_token || token,
    pageId: page.id,
    pageName: page.name || 'MayDo Facebook',
  };
}

async function resolveInstagramContext(): Promise<MetaContext | null> {
  const instagram = await readCredential('Instagram');
  const facebook = await readCredential('Facebook Page');
  if (!instagram && !facebook) return null;

  const token = facebook?.userToken
    || instagram?.userToken
    || facebook?.token
    || instagram?.token
    || instagram?.pageAccessToken;
  if (!token) return null;

  const response = await fetch(
    `${GRAPH_ROOT}/me/accounts?fields=id,name,access_token,instagram_business_account{id,username}&limit=100&access_token=${encodeURIComponent(token)}`,
    { signal: AbortSignal.timeout(12_000), cache: 'no-store' },
  );
  const payload = await response.json();
  if (!response.ok || payload?.error) {
    throw new Error(payload?.error?.message || 'Instagram token error');
  }

  const requestedId = instagram?.igAccountId;
  const page = (payload?.data || []).find((item: any) => {
    const accountId = item?.instagram_business_account?.id;
    return accountId && (!requestedId || accountId === requestedId);
  });
  if (!page?.instagram_business_account?.id) {
    throw new Error('Missing Instagram business account');
  }

  return {
    token: page.access_token || token,
    pageId: page.id,
    pageName: page.instagram_business_account.username || page.name || 'MayDo Instagram',
    businessAccountId: page.instagram_business_account.id,
  };
}

function messageText(message: MetaMessage): string {
  const text = message.message?.trim();
  if (text) return text;
  if ((message.attachments?.data?.length || 0) > 0) return 'Tệp đính kèm';
  return 'Tin nhắn không có nội dung văn bản';
}

export function normalizeMetaConversation(
  raw: MetaConversation,
  platform: 'facebook' | 'instagram',
  context: MetaContext,
): SalesInboxConversation | null {
  if (!raw.id) return null;

  const businessIds = new Set([context.pageId, context.businessAccountId].filter(Boolean));
  const participants = raw.participants?.data || [];
  const customer = participants.find((participant) => !businessIds.has(participant.id || '')) || participants[0];
  const customerId = customer?.id || raw.id;
  const normalizedMessages: SalesInboxMessage[] = (raw.messages?.data || [])
    .map((message, index) => ({
      id: message.id || `${raw.id}-${index}`,
      text: messageText(message),
      sentAt: message.created_time || raw.updated_time || new Date(0).toISOString(),
      direction: businessIds.has(message.from?.id || '') ? 'outbound' as const : 'inbound' as const,
      senderId: message.from?.id,
      senderName: message.from?.name || (businessIds.has(message.from?.id || '') ? context.pageName : customer?.name || 'Khách hàng'),
      hasAttachment: (message.attachments?.data?.length || 0) > 0,
    }))
    .sort((a, b) => new Date(a.sentAt).getTime() - new Date(b.sentAt).getTime());

  const lastMessage = normalizedMessages[normalizedMessages.length - 1];
  return {
    id: `${platform}-${raw.id}`,
    externalId: raw.id,
    platform,
    customer: {
      id: customerId,
      name: customer?.name || (platform === 'facebook' ? 'Khách Facebook' : 'Khách Instagram'),
      phone: '',
    },
    messages: normalizedMessages,
    lastMessage: lastMessage?.text || 'Chưa có nội dung tin nhắn',
    updatedAt: raw.updated_time || lastMessage?.sentAt || new Date(0).toISOString(),
    unreadCount: 0,
  };
}

async function fetchMetaConversations(
  platform: 'facebook' | 'instagram',
  context: MetaContext,
): Promise<SalesInboxConversation[]> {
  const platformParam = platform === 'instagram' ? '&platform=instagram' : '';
  const fields = 'id,updated_time,participants,messages.limit(40){id,message,created_time,from,attachments}';
  const url = `${GRAPH_ROOT}/${context.pageId}/conversations?fields=${encodeURIComponent(fields)}&limit=25${platformParam}&access_token=${encodeURIComponent(context.token)}`;
  const response = await fetch(url, {
    signal: AbortSignal.timeout(15_000),
    cache: 'no-store',
  });
  const payload = await response.json();
  if (!response.ok || payload?.error) {
    throw new Error(payload?.error?.message || `${platform} provider error`);
  }

  return (payload?.data || [])
    .map((conversation: MetaConversation) => normalizeMetaConversation(conversation, platform, context))
    .filter((conversation: SalesInboxConversation | null): conversation is SalesInboxConversation => Boolean(conversation));
}

async function loadMetaPlatform(
  platform: 'facebook' | 'instagram',
): Promise<{ conversations: SalesInboxConversation[]; status: SalesInboxPlatformStatus }> {
  try {
    const context = platform === 'facebook'
      ? await resolveFacebookContext()
      : await resolveInstagramContext();

    if (!context) {
      return {
        conversations: [],
        status: {
          platform,
          label: platformLabels[platform],
          state: 'disconnected',
          detail: 'Chưa kết nối tài khoản.',
          conversationCount: 0,
        },
      };
    }

    const conversations = await fetchMetaConversations(platform, context);
    return {
      conversations,
      status: {
        platform,
        label: platformLabels[platform],
        state: 'connected',
        detail: conversations.length > 0 ? 'Đang đọc dữ liệu thật.' : 'Đã kết nối, chưa có hội thoại.',
        conversationCount: conversations.length,
      },
    };
  } catch (error) {
    return {
      conversations: [],
      status: {
        platform,
        label: platformLabels[platform],
        state: 'error',
        detail: cleanProviderError(error),
        conversationCount: 0,
      },
    };
  }
}

async function loadTelegram(): Promise<{ conversations: SalesInboxConversation[]; status: SalesInboxPlatformStatus }> {
  const credential = await readCredential('Telegram');
  if (!credential) {
    return {
      conversations: [],
      status: {
        platform: 'telegram',
        label: platformLabels.telegram,
        state: 'disconnected',
        detail: 'Chưa kết nối bot Telegram.',
        conversationCount: 0,
      },
    };
  }

  const logs = await prisma.automationLog.findMany({
    where: { source: 'sync-telegram', details: { not: null } },
    orderBy: { createdAt: 'desc' },
    take: 500,
  });
  const grouped = new Map<string, SalesInboxConversation>();

  for (const log of logs.reverse()) {
    try {
      const details = JSON.parse(log.details || '{}');
      if (!details.chatId || !details.text || !details.updateId) continue;
      const externalId = String(details.chatId);
      const id = `telegram-${externalId}`;
      const sentAt = details.date || log.createdAt.toISOString();
      const message: SalesInboxMessage = {
        id: `telegram-${details.updateId}`,
        text: String(details.text),
        sentAt,
        direction: 'inbound',
        senderId: externalId,
        senderName: details.from || details.chatTitle || 'Khách Telegram',
        hasAttachment: false,
      };
      const existing = grouped.get(id);
      if (existing) {
        existing.messages.push(message);
        existing.lastMessage = message.text;
        existing.updatedAt = sentAt;
      } else {
        grouped.set(id, {
          id,
          externalId,
          platform: 'telegram',
          customer: {
            id: externalId,
            name: details.chatTitle || details.from || 'Khách Telegram',
            phone: '',
          },
          messages: [message],
          lastMessage: message.text,
          updatedAt: sentAt,
          unreadCount: 0,
        });
      }
    } catch {
      // Ignore aggregate and malformed provider logs.
    }
  }

  const conversations = Array.from(grouped.values());
  return {
    conversations,
    status: {
      platform: 'telegram',
      label: platformLabels.telegram,
      state: 'connected',
      detail: conversations.length > 0 ? 'Đang đọc tin nhắn đã đồng bộ.' : 'Đã kết nối, chưa có tin nhắn được đồng bộ.',
      conversationCount: conversations.length,
    },
  };
}

async function loadLimitedPlatform(
  platform: 'zalo' | 'tiktok' | 'manychat',
  credentialName: string,
  connectedDetail: string,
): Promise<{ conversations: SalesInboxConversation[]; status: SalesInboxPlatformStatus }> {
  const credential = await readCredential(credentialName);
  return {
    conversations: [],
    status: {
      platform,
      label: platformLabels[platform],
      state: credential ? 'limited' : 'disconnected',
      detail: credential ? connectedDetail : 'Chưa kết nối tài khoản.',
      conversationCount: 0,
    },
  };
}

export interface InboxPersistencePlan {
  conversationKey: { platform: SalesInboxPlatform; externalId: string };
  conversation: {
    customerExternalId: string;
    customerName: string;
    customerPhone: string;
    lastMessage: string;
    lastMessageAt: Date;
    unreadCount: number;
  };
  messages: Array<{
    externalId: string;
    direction: 'inbound' | 'outbound';
    senderExternalId?: string;
    senderName: string;
    text: string;
    hasAttachment: boolean;
    sentAt: Date;
  }>;
  deleteMissing: false;
}

function validDate(value: string): Date {
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? new Date(0) : date;
}

export function buildInboxPersistencePlan(conversation: SalesInboxConversation): InboxPersistencePlan {
  const messagesByExternalId = new Map<string, InboxPersistencePlan['messages'][number]>();
  for (const message of conversation.messages) {
    messagesByExternalId.set(message.id, {
      externalId: message.id,
      direction: message.direction,
      senderExternalId: message.senderId,
      senderName: message.senderName,
      text: message.text,
      hasAttachment: message.hasAttachment,
      sentAt: validDate(message.sentAt),
    });
  }

  return {
    conversationKey: {
      platform: conversation.platform,
      externalId: conversation.externalId,
    },
    conversation: {
      customerExternalId: conversation.customer.id,
      customerName: conversation.customer.name,
      customerPhone: conversation.customer.phone,
      lastMessage: conversation.lastMessage,
      lastMessageAt: validDate(conversation.updatedAt),
      unreadCount: conversation.unreadCount,
    },
    messages: Array.from(messagesByExternalId.values()),
    deleteMissing: false,
  };
}

function sameDate(left: Date | null, right: Date): boolean {
  return left?.getTime() === right.getTime();
}

async function persistConversation(conversation: SalesInboxConversation): Promise<void> {
  const plan = buildInboxPersistencePlan(conversation);
  const existing = await prisma.salesConversation.findUnique({
    where: { platform_externalId: plan.conversationKey },
    include: {
      messages: {
        select: {
          externalId: true,
          direction: true,
          senderExternalId: true,
          senderName: true,
          text: true,
          hasAttachment: true,
          sentAt: true,
        },
      },
    },
  });

  if (!existing) {
    await prisma.salesConversation.create({
      data: {
        platform: plan.conversationKey.platform,
        externalId: plan.conversationKey.externalId,
        ...plan.conversation,
        messages: { create: plan.messages },
      },
    });
    return;
  }

  const operations = [];
  const conversationChanged = existing.customerExternalId !== plan.conversation.customerExternalId
    || existing.customerName !== plan.conversation.customerName
    || (existing.customerPhone || '') !== plan.conversation.customerPhone
    || (existing.lastMessage || '') !== plan.conversation.lastMessage
    || !sameDate(existing.lastMessageAt, plan.conversation.lastMessageAt)
    || existing.unreadCount !== plan.conversation.unreadCount;

  if (conversationChanged) {
    operations.push(prisma.salesConversation.update({
      where: { id: existing.id },
      data: plan.conversation,
    }));
  }

  const existingMessages = new Map(existing.messages.map((message) => [message.externalId, message]));
  const newMessages: InboxPersistencePlan['messages'] = [];

  for (const message of plan.messages) {
    const stored = existingMessages.get(message.externalId);
    if (!stored) {
      newMessages.push(message);
      continue;
    }

    const changed = stored.direction !== message.direction
      || (stored.senderExternalId || '') !== (message.senderExternalId || '')
      || stored.senderName !== message.senderName
      || stored.text !== message.text
      || stored.hasAttachment !== message.hasAttachment
      || !sameDate(stored.sentAt, message.sentAt);
    if (!changed) continue;

    operations.push(prisma.salesMessage.update({
      where: {
        conversationId_externalId: {
          conversationId: existing.id,
          externalId: message.externalId,
        },
      },
      data: message,
    }));
  }

  if (newMessages.length > 0) {
    operations.push(prisma.salesMessage.createMany({
      data: newMessages.map((message) => ({ ...message, conversationId: existing.id })),
      skipDuplicates: true,
    }));
  }

  if (operations.length > 0) await prisma.$transaction(operations);
}

async function updateSyncState(status: SalesInboxPlatformStatus, attemptedAt: Date): Promise<void> {
  const storedCount = await prisma.salesConversation.count({ where: { platform: status.platform } });
  const successData = status.state === 'connected' ? { lastSuccessAt: attemptedAt } : {};
  await prisma.salesInboxSyncState.upsert({
    where: { platform: status.platform },
    update: {
      state: status.state,
      detail: status.detail,
      conversationCount: storedCount,
      lastAttemptAt: attemptedAt,
      ...successData,
    },
    create: {
      platform: status.platform,
      state: status.state,
      detail: status.detail,
      conversationCount: storedCount,
      lastAttemptAt: attemptedAt,
      ...(status.state === 'connected' ? { lastSuccessAt: attemptedAt } : {}),
    },
  });
}

export async function syncSalesInboxToDatabase(): Promise<SalesInboxResponse> {
  const attemptedAt = new Date();
  const results = await Promise.all([
    loadMetaPlatform('facebook'),
    loadMetaPlatform('instagram'),
    loadLimitedPlatform('zalo', 'Zalo', 'Đã kết nối. Cần bật webhook tin nhắn Zalo OA để nhận lịch sử mới.'),
    loadLimitedPlatform('tiktok', 'TikTok', 'Đã kết nối. Tài khoản hiện chưa có quyền Business Messaging API.'),
    loadLimitedPlatform('manychat', 'ManyChat', 'Đã kết nối. API hiện tại chỉ đọc người đăng ký, chưa đọc nội dung hội thoại.'),
    loadTelegram(),
  ]);

  for (const result of results) {
    for (const conversation of result.conversations) {
      await persistConversation(conversation);
    }
    await updateSyncState(result.status, attemptedAt);
  }

  return getSalesInbox();
}

const limitedDetails: Partial<Record<SalesInboxPlatform, string>> = {
  zalo: 'Đã kết nối. Cần bật webhook tin nhắn Zalo OA để nhận lịch sử mới.',
  tiktok: 'Đã kết nối. Tài khoản hiện chưa có quyền Business Messaging API.',
  manychat: 'Đã kết nối. API hiện tại chỉ đọc người đăng ký, chưa đọc nội dung hội thoại.',
};

async function defaultPlatformStatus(platform: SalesInboxPlatform): Promise<SalesInboxPlatformStatus> {
  const credentialNames: Record<SalesInboxPlatform, string> = {
    facebook: 'Facebook Page',
    instagram: 'Instagram',
    zalo: 'Zalo',
    tiktok: 'TikTok',
    manychat: 'ManyChat',
    telegram: 'Telegram',
  };
  const connected = Boolean(await readCredential(credentialNames[platform]));
  const limited = connected && Boolean(limitedDetails[platform]);
  return {
    platform,
    label: platformLabels[platform],
    state: limited ? 'limited' : connected ? 'connected' : 'disconnected',
    detail: limitedDetails[platform]
      || (connected ? 'Đã kết nối, đang chờ lần đồng bộ đầu tiên.' : 'Chưa kết nối tài khoản.'),
    conversationCount: 0,
  };
}

export async function getSalesInbox(): Promise<SalesInboxResponse> {
  const [storedConversations, syncStates] = await Promise.all([
    prisma.salesConversation.findMany({
      orderBy: { lastMessageAt: 'desc' },
      take: 100,
      include: {
        messages: {
          orderBy: { sentAt: 'desc' },
          take: 200,
        },
      },
    }),
    prisma.salesInboxSyncState.findMany(),
  ]);

  const conversations: SalesInboxConversation[] = storedConversations.map((conversation) => ({
    id: `${conversation.platform}-${conversation.externalId}`,
    externalId: conversation.externalId,
    platform: conversation.platform as SalesInboxPlatform,
    customer: {
      id: conversation.customerExternalId || conversation.externalId,
      name: conversation.customerName,
      phone: conversation.customerPhone || '',
    },
    messages: [...conversation.messages].reverse().map((message) => ({
      id: message.externalId,
      text: message.text,
      sentAt: message.sentAt.toISOString(),
      direction: message.direction as 'inbound' | 'outbound',
      senderId: message.senderExternalId || undefined,
      senderName: message.senderName,
      hasAttachment: message.hasAttachment,
    })),
    lastMessage: conversation.lastMessage || 'Chưa có nội dung tin nhắn',
    updatedAt: conversation.lastMessageAt?.toISOString() || conversation.updatedAt.toISOString(),
    unreadCount: conversation.unreadCount,
  }));

  const stateMap = new Map(syncStates.map((state) => [state.platform, state]));
  const platforms = await Promise.all(SALES_INBOX_PLATFORMS.map(async (platform) => {
    const stored = stateMap.get(platform);
    if (!stored) return defaultPlatformStatus(platform);
    return {
      platform,
      label: platformLabels[platform],
      state: stored.state as SalesInboxPlatformStatus['state'],
      detail: stored.detail || 'Chưa có thông tin đồng bộ.',
      conversationCount: stored.conversationCount,
    };
  }));

  return {
    conversations,
    platforms,
    fetchedAt: syncStates
      .map((state) => state.lastAttemptAt)
      .filter((date): date is Date => Boolean(date))
      .sort((a, b) => b.getTime() - a.getTime())[0]?.toISOString() || '',
  };
}
