import React, { useState, useRef, useEffect } from 'react';
import { usePolling } from '../hooks/usePolling';
import { api } from '../api/client';
import styles from './Inbox.module.css';

const Inbox = () => {
  const [activeConvoId, setActiveConvoId] = useState(null);
  const [replyText, setReplyText] = useState('');
  const [isSending, setIsSending] = useState(false);
  const messagesEndRef = useRef(null);

  // Poll for conversations every 3 seconds
  const fetchConversations = async () => {
    return api.get('/api/v1/inbox/conversations');
  };

  const { data, isLoading, error, refetch } = usePolling(fetchConversations, 3000);
  const conversations = data || [];

  const activeConvo = conversations?.find((c) => c.id === activeConvoId);

  // Auto-scroll to bottom when messages change
  useEffect(() => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [activeConvo?.messages]);

  const handleSend = async () => {
    if (!replyText.trim() || !activeConvoId) return;

    setIsSending(true);
    try {
      await api.post(`/api/v1/inbox/conversations/${activeConvoId}/reply`, {
        content: replyText.trim(),
      });
      setReplyText('');
      // Force refetch to show the message immediately
      refetch();
    } catch (err) {
      console.error('Failed to send message:', err);
      // In a real app, you might show a toast error here
    } finally {
      setIsSending(false);
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  return (
    <div className={styles.page}>
      <div className={styles.header}>
        <h1 className={styles.title}>💬 Unified Inbox</h1>
      </div>

      <div className={styles.uniboxContainer}>
        {/* Sidebar List */}
        <div className={styles.sidebar}>
          <div className={styles.sidebarHeader}>
            Active Conversations
          </div>
          <div className={styles.conversationList}>
            {isLoading && conversations.length === 0 ? (
              <div className={styles.emptyList}>Loading...</div>
            ) : error && conversations.length === 0 ? (
              <div className={styles.emptyList} style={{ color: 'var(--color-error)' }}>
                {error}
              </div>
            ) : conversations.length === 0 ? (
              <div className={styles.emptyList}>No conversations yet</div>
            ) : (
              conversations.map((convo) => (
                <div
                  key={convo.id}
                  className={`${styles.conversationItem} ${
                    activeConvoId === convo.id ? styles.conversationItemActive : ''
                  }`}
                  onClick={() => setActiveConvoId(convo.id)}
                >
                  <div className={styles.convoTop}>
                    <span className={styles.targetName}>{convo.targetName}</span>
                    <span className={styles.accountBadge}>{convo.accountName || 'Account'}</span>
                  </div>
                  <div className={styles.lastMessage}>
                    {convo.lastMessage || (convo.messages?.length > 0 ? convo.messages[convo.messages.length - 1].content : 'No messages')}
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Chat Pane */}
        {activeConvo ? (
          <div className={styles.chatPane}>
            <div className={styles.chatHeader}>
              <div className={styles.chatTarget}>{activeConvo.targetName}</div>
              <div className={styles.chatAccount}>
                <span>Sent via:</span>
                <span className="tag" style={{ margin: 0 }}>
                  {activeConvo.accountName || 'Unknown Account'}
                </span>
              </div>
            </div>

            <div className={styles.messagesArea}>
              {activeConvo.messages?.map((msg, idx) => {
                const isInbound = msg.direction === 'INBOUND';
                return (
                  <div
                    key={msg.id || idx}
                    className={`${styles.messageWrapper} ${
                      isInbound ? styles.inbound : styles.outbound
                    }`}
                  >
                    <div className={styles.messageBubble}>{msg.content}</div>
                    {msg.createdAt && (
                      <div className={styles.messageTime}>
                        {new Date(msg.createdAt).toLocaleTimeString([], {
                          hour: '2-digit',
                          minute: '2-digit',
                        })}
                      </div>
                    )}
                  </div>
                );
              })}
              <div ref={messagesEndRef} />
            </div>

            <div className={styles.inputArea}>
              <textarea
                className={styles.textarea}
                rows={2}
                placeholder="Type a message... (Enter to send, Shift+Enter for new line)"
                value={replyText}
                onChange={(e) => setReplyText(e.target.value)}
                onKeyDown={handleKeyDown}
                disabled={isSending}
              />
              <button
                className={styles.sendBtn}
                onClick={handleSend}
                disabled={!replyText.trim() || isSending}
              >
                {isSending ? '...' : 'Send'}
              </button>
            </div>
          </div>
        ) : (
          <div className={styles.noSelection}>
            Select a conversation to start chatting
          </div>
        )}
      </div>
    </div>
  );
};

export default Inbox;
