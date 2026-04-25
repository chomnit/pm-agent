-- Migration 005: Telegram Messenger Module
-- Run this to add Telegram integration tables.

CREATE TABLE telegram_sessions (
  id               CHAR(36)     NOT NULL DEFAULT (UUID()),
  user_id          CHAR(36)     NOT NULL,
  telegram_user_id BIGINT       NOT NULL,
  telegram_username VARCHAR(255) NULL,
  phone_number     VARCHAR(50)  NULL,
  session_string   TEXT         NOT NULL,
  status           ENUM('connected','disconnected') NOT NULL DEFAULT 'connected',
  connected_at     DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at       DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uq_tg_session_user (user_id),
  CONSTRAINT fk_tgsess_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE TABLE telegram_conversations (
  id               CHAR(36)     NOT NULL DEFAULT (UUID()),
  user_id          CHAR(36)     NOT NULL,
  telegram_peer_id BIGINT       NOT NULL,
  peer_type        ENUM('user','group','channel') NOT NULL DEFAULT 'user',
  peer_name        VARCHAR(255) NOT NULL,
  peer_username    VARCHAR(255) NULL,
  last_message     TEXT         NULL,
  last_message_at  DATETIME     NULL,
  unread_count     INT          NOT NULL DEFAULT 0,
  updated_at       DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uq_tg_peer (user_id, telegram_peer_id),
  CONSTRAINT fk_tgconv_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE TABLE telegram_messages (
  id                  CHAR(36)  NOT NULL DEFAULT (UUID()),
  conversation_id     CHAR(36)  NOT NULL,
  telegram_message_id BIGINT    NOT NULL,
  is_outgoing         BOOLEAN   NOT NULL DEFAULT FALSE,
  sender_name         VARCHAR(255) NULL,
  text                TEXT      NULL,
  media_type          ENUM('none','photo','voice','document') NOT NULL DEFAULT 'none',
  media_mime          VARCHAR(100) NULL,
  telegram_media_id   BIGINT    NULL,
  sent_at             DATETIME  NOT NULL,
  created_at          DATETIME  NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uq_tg_message (conversation_id, telegram_message_id),
  CONSTRAINT fk_tgmsg_conv FOREIGN KEY (conversation_id) REFERENCES telegram_conversations(id) ON DELETE CASCADE
);

CREATE TABLE messenger_agent_chats (
  id              CHAR(36)  NOT NULL DEFAULT (UUID()),
  user_id         CHAR(36)  NOT NULL,
  conversation_id CHAR(36)  NOT NULL,
  project_id      CHAR(36)  NULL,
  messages        JSON      NOT NULL,
  created_at      DATETIME  NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at      DATETIME  NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uq_agent_chat (user_id, conversation_id),
  CONSTRAINT fk_mac_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  CONSTRAINT fk_mac_conv FOREIGN KEY (conversation_id) REFERENCES telegram_conversations(id) ON DELETE CASCADE
);

CREATE INDEX idx_tgconv_user_updated ON telegram_conversations(user_id, updated_at DESC);
CREATE INDEX idx_tgmsg_conv_sent     ON telegram_messages(conversation_id, sent_at ASC);
