"use client";

import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import {
  CHANGELOG_SEEN_EVENT,
  isChangelogUnseen,
  readSeenChangelogVersion,
} from "~/lib/habitquest/changelog";

export function useChangelogUnseen() {
  const pathname = usePathname();
  const [unseen, setUnseen] = useState(false);

  useEffect(() => {
    function sync() {
      setUnseen(isChangelogUnseen(readSeenChangelogVersion()));
    }

    sync();
    window.addEventListener(CHANGELOG_SEEN_EVENT, sync);
    return () => window.removeEventListener(CHANGELOG_SEEN_EVENT, sync);
  }, [pathname]);

  return unseen;
}
