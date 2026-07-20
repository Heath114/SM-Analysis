import { createContext, useCallback, useContext, useRef, useState, type ReactNode } from "react";

const Ctx = createContext<(msg: string) => void>(() => {});

export function ToastProvider({ children }: { children: ReactNode }) {
  const [msg, setMsg] = useState<string | null>(null);
  const [show, setShow] = useState(false);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const toast = useCallback((m: string) => {
    if (timer.current) clearTimeout(timer.current);
    setMsg(m);
    setShow(true);
    timer.current = setTimeout(() => setShow(false), 2600);
  }, []);

  return (
    <Ctx.Provider value={toast}>
      {children}
      <div className={`toast${show ? " show" : ""}`} role="status" aria-live="polite">{msg}</div>
    </Ctx.Provider>
  );
}

export function useToast() {
  return useContext(Ctx);
}
