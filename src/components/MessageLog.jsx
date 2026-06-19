import { useEffect, useRef, memo } from 'react';
import './MessageLog.css';

const MessageLog = memo(function MessageLog({ messages = [] }) {
  const containerRef = useRef(null);

  // Auto-scroll to bottom
  useEffect(() => {
    if (containerRef.current) {
      containerRef.current.scrollTop = containerRef.current.scrollHeight;
    }
  }, [messages]);

  // Show last 8 messages
  const displayMessages = messages.slice(-8);

  return (
    <div className="message-log">
      <div className="message-log__header">COMBAT LOG</div>
      <div className="message-log__container" ref={containerRef}>
        {displayMessages.length === 0 ? (
          <div className="message-log__empty">Awaiting orders…</div>
        ) : (
          displayMessages.map((msg, i) => {
            const isHit = msg.includes('HIT');
            const isSunk = msg.includes('SUNK');
            const isMiss = msg.includes('Miss');
            const isEnemy = msg.startsWith('Enemy');
            let cls = 'message-log__entry';
            if (isSunk) cls += ' message-log__entry--sunk';
            else if (isHit) cls += ' message-log__entry--hit';
            else if (isMiss) cls += ' message-log__entry--miss';
            if (isEnemy) cls += ' message-log__entry--enemy';

            return (
              <div key={i} className={cls}>
                <span className="message-log__time">
                  {String(i + 1).padStart(2, '0')}
                </span>
                <span className="message-log__msg">{msg}</span>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
});

export default MessageLog;
