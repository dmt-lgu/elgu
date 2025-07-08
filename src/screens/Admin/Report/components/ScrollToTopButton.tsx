import React from "react";
import { ChevronUp, ChevronDown } from "lucide-react";
import { Button } from "@/components/ui/button";

interface ScrollToTopButtonProps {
  scrollTargetRef?: React.RefObject<HTMLElement>;
  tableRowSelector?: string; // Optional: CSS selector for table rows
}

const DEFAULT_ROW_HEIGHT = 44; // px, fallback if row height can't be determined

const ScrollToTopButton: React.FC<ScrollToTopButtonProps> = ({
  scrollTargetRef,
  tableRowSelector = "tr" // Default to all table rows
}) => {
  const handleScrollTop = () => {
    if (scrollTargetRef?.current) {
      scrollTargetRef.current.scrollTo({ top: 0, behavior: "smooth" });
    } else {
      window.scrollTo({ top: 0, behavior: "smooth" });
    }
  };

  const handleScrollBottom = () => {
    let scrollContainer: HTMLElement | (Window & typeof globalThis) = window;
    let currentScrollTop = window.scrollY || window.pageYOffset;
    let maxScroll = document.body.scrollHeight - window.innerHeight;

    if (scrollTargetRef?.current) {
      scrollContainer = scrollTargetRef.current;
      currentScrollTop = scrollContainer.scrollTop;
      maxScroll = scrollContainer.scrollHeight - scrollContainer.clientHeight;
    }

    // Try to find the height of 10 rows
    let scrollBy = DEFAULT_ROW_HEIGHT * 10;
    if (scrollContainer instanceof HTMLElement) {
      const rows = scrollContainer.querySelectorAll(tableRowSelector);
      if (rows.length > 0) {
        let totalHeight = 0;
        let count = 0;
        for (let i = 0; i < rows.length && count < 10; i++) {
          const row = rows[i] as HTMLElement;
          totalHeight += row.offsetHeight || DEFAULT_ROW_HEIGHT;
          count++;
        }
        scrollBy = totalHeight;
      }
    } else {
      // For window, try to find rows in document
      const rows = document.querySelectorAll(tableRowSelector);
      if (rows.length > 0) {
        let totalHeight = 0;
        let count = 0;
        for (let i = 0; i < rows.length && count < 10; i++) {
          const row = rows[i] as HTMLElement;
          totalHeight += row.offsetHeight || DEFAULT_ROW_HEIGHT;
          count++;
        }
        scrollBy = totalHeight;
      }
    }

    const nextScroll = Math.min(currentScrollTop + scrollBy, maxScroll);

    if (scrollContainer instanceof HTMLElement) {
      scrollContainer.scrollTo({ top: nextScroll, behavior: "smooth" });
    } else {
      window.scrollTo({ top: nextScroll, behavior: "smooth" });
    }
  };

  return (
    <div className="fixed bottom-8 right-8 z-50 flex flex-col gap-2">
      <Button
        aria-label="Scroll to top"
        title="Scroll to top"
        onClick={handleScrollTop}
        className="hover:bg-primary text-white rounded-full shadow-lg p-3 bg-primary/80 transition-all"
        style={{ boxShadow: "0 2px 8px rgba(0,0,0,0.2)" }}
      >
        <ChevronUp size={20} />
      </Button>
      <Button
        aria-label="Scroll down by 10 rows"
        title="Scroll down by 10 rows"
        onClick={handleScrollBottom}
        className="hover:bg-primary text-white rounded-full shadow-lg p-3 bg-primary/80 transition-all"
        style={{ boxShadow: "0 2px 8px rgba(0,0,0,0.2)" }}
      >
        <ChevronDown size={20} />
      </Button>
    </div>
  );
};

export default ScrollToTopButton;