import React, { useState, useEffect } from 'react';
import { useSpring, animated } from '@react-spring/web';

type IncreasingTextAnimationProps = {
  text: string;
  delay?: number;
  speed?: number;
  scrambleSpeed?: number;
  isNumber?: boolean;
};

const IncreasingTextAnimation: React.FC<IncreasingTextAnimationProps> = ({
  text,
  delay = 500,
  speed = 300,
  scrambleSpeed = 50,
  isNumber = false,
}) => {
  const [displayText, setDisplayText] = useState('');
  const characters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';

  // Format number with commas
  const formatNumber = (num: string) => {
    if (!isNumber) return num;
    const number = parseInt(num.replace(/,/g, ''));
    return isNaN(number) ? num : number.toLocaleString();
  };



  const spring = useSpring({
    opacity: 1,
    from: { opacity: 0 },
    delay,
  });

  useEffect(() => {
    let timeoutId: NodeJS.Timeout;
    let scrambleTimeoutId: NodeJS.Timeout;
    let index = 0;

    // Get the formatted text to work with
    const formattedText = formatNumber(text);

    const revealText = () => {
      if (index <= formattedText.length) {
        // Shuffle characters before showing the correct one
        scrambleTimeoutId = setInterval(() => {
          const scrambledText = formattedText
            .split('')
            .map((char, i) =>
              i < index
                ? char
                : char === ',' ? ',' : characters[Math.floor(Math.random() * characters.length)]
            )
            .join('');
          setDisplayText(scrambledText);
        }, scrambleSpeed);

        // Once the scramble is done, show the correct character
        timeoutId = setTimeout(() => {
          clearInterval(scrambleTimeoutId);
          setDisplayText(formattedText.slice(0, index + 1));
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
  }, [text, speed, scrambleSpeed, isNumber]);

  return <animated.span style={spring}>{displayText}</animated.span>;
};

export default IncreasingTextAnimation;
