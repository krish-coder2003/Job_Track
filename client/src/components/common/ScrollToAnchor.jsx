import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';

/**
 * Global router companion to ensure anchor links (e.g. /#system-health, /#architecture, /#features)
 * scroll smoothly to their target element across page transitions, and resets scroll to top
 * on standard page navigation.
 */
export default function ScrollToAnchor() {
  const { pathname, hash } = useLocation();

  useEffect(() => {
    if (hash) {
      const targetId = hash.replace(/^#/, '');
      // Try immediate lookup or retry slightly after React mounts dynamic sections
      const scrollToElement = () => {
        const el = document.getElementById(targetId);
        if (el) {
          el.scrollIntoView({ behavior: 'smooth', block: 'start' });
          return true;
        }
        return false;
      };

      if (!scrollToElement()) {
        const timer = setTimeout(scrollToElement, 150);
        return () => clearTimeout(timer);
      }
    } else {
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  }, [pathname, hash]);

  return null;
}
