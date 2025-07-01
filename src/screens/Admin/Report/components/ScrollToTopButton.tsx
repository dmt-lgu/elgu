import React from "react";
import { ChevronUp } from "lucide-react";

interface ScrollToTopButtonProps {
  scrollTargetRef?: React.RefObject<HTMLElement>;
}

const ScrollToTopButton: React.FC<ScrollToTopButtonProps> = ({ scrollTargetRef }) => {
  const scrollToTop = () => {
    if (scrollTargetRef?.current) {
      scrollTargetRef.current.scrollTo({ top: 0, behavior: "smooth" });
    } else {
      window.scrollTo({ top: 0, behavior: "smooth" });
    }
  };

  return (
    <button
      aria-label="Scroll to top"
      title="Scroll to top"
      onClick={scrollToTop}
      className="fixed bottom-8 right-8 z-50 hover:bg-primary text-white rounded-full shadow-lg p-3 bg-primary/80 transition-all"
      style={{ boxShadow: "0 2px 8px rgba(0,0,0,0.2)" }}
    >
      <ChevronUp size={28} />
    </button>
  );
};

export default ScrollToTopButton;