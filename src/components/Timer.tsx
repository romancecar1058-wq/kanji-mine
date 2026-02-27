import { useEffect, useState, useRef } from 'react';

interface TimerProps {
  seconds: number;
  onTimeout: () => void;
  paused?: boolean;
  color?: string;
}

export default function Timer({ seconds, onTimeout, paused, color }: TimerProps) {
  const [remaining, setRemaining] = useState(seconds);
  const onTimeoutRef = useRef(onTimeout);
  onTimeoutRef.current = onTimeout;

  useEffect(() => {
    setRemaining(seconds);
  }, [seconds]);

  useEffect(() => {
    if (paused) return;
    if (remaining <= 0) {
      onTimeoutRef.current();
      return;
    }
    const id = setInterval(() => {
      setRemaining(prev => {
        if (prev <= 0.1) {
          clearInterval(id);
          return 0;
        }
        return prev - 0.1;
      });
    }, 100);
    return () => clearInterval(id);
  }, [remaining <= 0, paused]); // eslint-disable-line react-hooks/exhaustive-deps

  const pct = (remaining / seconds) * 100;
  const isDanger = remaining < 3;

  return (
    <div
      className="timer-bar"
      style={isDanger ? { boxShadow: '0 0 12px rgba(255, 107, 107, 0.4)' } : undefined}
    >
      <div
        className={`timer-bar-fill ${isDanger ? 'danger' : ''}`}
        style={{
          width: `${pct}%`,
          ...(isDanger ? {} : color ? { background: color } : {}),
        }}
      />
    </div>
  );
}
