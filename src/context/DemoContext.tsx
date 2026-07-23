import { createContext, useCallback, useContext, useState, type ReactNode } from "react";
import { isDemoMode, enterDemo, exitDemo } from "../lib/demoData";

interface DemoState {
  demo: boolean;
  enter: () => void;
  exit: () => void;
}
const Ctx = createContext<DemoState>({ demo: false, enter: () => {}, exit: () => {} });

export function DemoProvider({ children }: { children: ReactNode }) {
  const [demo, setDemo] = useState(isDemoMode());
  const enter = useCallback(() => { enterDemo(); setDemo(true); }, []);
  const exit = useCallback(() => { exitDemo(); setDemo(false); }, []);
  return <Ctx.Provider value={{ demo, enter, exit }}>{children}</Ctx.Provider>;
}

export const useDemo = () => useContext(Ctx);
