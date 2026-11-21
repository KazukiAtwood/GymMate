import { useRef, useState } from "react";

export function useSubmitLock() {
  const locked = useRef(false);
  const [pending, setPending] = useState(false);

  async function run(action: () => Promise<void>) {
    if (locked.current) {
      return;
    }

    locked.current = true;
    setPending(true);

    try {
      await action();
    } finally {
      locked.current = false;
      setPending(false);
    }
  }

  return { pending, run };
}
