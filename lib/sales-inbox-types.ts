export const SALES_INBOX_PLATFORMS = [
  'facebook',
  'instagram',
  'zalo',
  'tiktok',
  'manychat',
  'telegram',
] as const;

export type SalesInboxPlatform = (typeof SALES_INBOX_PLATFORMS)[number];

export type PlatformConnectionState = 'connected' | 'disconnected' | 'limited' | 'error';

export interface SalesInboxMessage {
  id: string;
  text: string;
  sentAt: string;
  direction: 'inbound' | 'outbound';
  senderId?: string;
  senderName: string;
  hasAttachment: boolean;
}

export interface SalesInboxConversation {
  id: string;
  externalId: string;
  platform: SalesInboxPlatform;
  customer: {
    id: string;
    name: string;
    phone: string;
  };
  messages: SalesInboxMessage[];
  lastMessage: string;
  updatedAt: string;
  unreadCount: number;
}

export interface SalesInboxPlatformStatus {
  platform: SalesInboxPlatform;
  label: string;
  state: PlatformConnectionState;
  detail: string;
  conversationCount: number;
}

export interface SalesInboxResponse {
  conversations: SalesInboxConversation[];
  platforms: SalesInboxPlatformStatus[];
  fetchedAt: string;
}
