import React, { useState, useEffect } from 'react';
import { useSpring, animated } from '@react-spring/web';

type IncreasingTextAnimationProps = {
  text: string;
  delay?: number;
  speed?: number;
  scrambleSpeed?: number;
};

const IncreasingTextAnimation: React.FC<IncreasingTextAnimationProps> = ({
  text,
  delay = 500,
  speed = 300,
  scrambleSpeed = 50,
}) => {
  const [displayText, setDisplayText] = useState('');
  const characters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';

  const spring = useSpring({
    opacity: 1,
    from: { opacity: 0 },
    delay,
  });

  useEffect(() => {
    let timeoutId: NodeJS.Timeout;
    let scrambleTimeoutId: NodeJS.Timeout;
    let index = 0;

    const revealText = () => {
      if (index <= text.length) {
        // Shuffle characters before showing the correct one
        scrambleTimeoutId = setInterval(() => {
          const scrambledText = text
            .split('')
            .map((char, i) =>
              i < index
                ? char
                : characters[Math.floor(Math.random() * characters.length)]
            )
            .join('');
          setDisplayText(scrambledText);
        }, scrambleSpeed);

        // Once the scramble is done, show the correct character
        timeoutId = setTimeout(() => {
          clearInterval(scrambleTimeoutId);
          setDisplayText(text.slice(0, index + 1));
          index++;
          revealText();
        }, speed);
      }
    };

    revealText();

    return () => {
      clearTimeout(timeoutId);
      clearInterval(scrambleTimeoutId);
    };
  }, [text, speed, scrambleSpeed]);

  return <animated.span style={spring}>{displayText}</animated.span>;
};

export default IncreasingTextAnimation;
