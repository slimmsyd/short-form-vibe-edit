// Motion library entry point. Each scene in scenes.json with a `motion` field
// is matched by name to one of these exports. To add a new template, create
// a file in this directory, register it here, AND add an entry to catalog.json.

import { ChartConvergence } from "./ChartConvergence";
import { Timeline } from "./Timeline";
import { ProblemSolution } from "./ProblemSolution";
import { BrowserBuilds } from "./BrowserBuilds";
import { ClockProgress } from "./ClockProgress";
import { TierStack } from "./TierStack";
import { KineticType } from "./KineticType";
import { TerminalCommand } from "./TerminalCommand";
import { SplitWipe } from "./SplitWipe";
import { NetworkNodes } from "./NetworkNodes";

export const LIBRARY: Record<string, React.FC<any>> = {
  ChartConvergence,
  Timeline,
  ProblemSolution,
  BrowserBuilds,
  ClockProgress,
  TierStack,
  KineticType,
  TerminalCommand,
  SplitWipe,
  NetworkNodes,
};

export {
  ChartConvergence,
  Timeline,
  ProblemSolution,
  BrowserBuilds,
  ClockProgress,
  TierStack,
  KineticType,
  TerminalCommand,
  SplitWipe,
  NetworkNodes,
};

export * from "./shared";
