import React from 'react';

type IncreasingTextAnimationProps = {
  text: string;
  delay?: number;
  speed?: number;
  scrambleSpeed?: number;
  isNumber?: boolean;
};

const IncreasingTextAnimation: React.FC<IncreasingTextAnimationProps> = ({ text, isNumber = false }) => {
  const display = isNumber
    ? (() => { const n = parseInt(String(text).replace(/,/g, '')); return isNaN(n) ? text : n.toLocaleString(); })()
    : text;

  return (
    <span
      key={display}
      style={{ animation: 'fadeInValue 0.35s ease-out both' }}
    >
      {display}
      <style>{`
        @keyframes fadeInValue {
          from { opacity: 0; transform: translateY(4px); }
          to   { opacity: 1; transform: translateY(0);   }
        }
      `}</style>
    </span>
  );
};

export default IncreasingTextAnimation;
