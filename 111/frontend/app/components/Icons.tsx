import { ElementType } from "react";
import { Target, Stethoscope, Compass, Scissors, Map, Zap, BrainCircuit, Siren, GitBranch, MessageSquare, Ear, Users, Coffee, Puzzle, Eye, Activity } from "lucide-react";
import { PoliticsRadarIcon } from "./PoliticsRadarIcon";

export const toolIconMap: Record<string, ElementType> = {
  grow: Target,
  "team-diagnosis": Stethoscope,
  "politics-radar": PoliticsRadarIcon,
  "integration-compass": Compass,
  "decision-razor": Scissors,
  "business-wargame": Map,
  "team-igniter": Zap,
  "six-thinking-hats": BrainCircuit,
  "crisis-response": Siren,
  "task-delegation": GitBranch,
  "negative-feedback": MessageSquare,
  target: Target,
  stethoscope: Stethoscope,
  radar: PoliticsRadarIcon,
  compass: Compass,
  scissors: Scissors,
  map: Map,
  zap: Zap,
  brain: BrainCircuit,
  siren: Siren,
  branch: GitBranch,
  message: MessageSquare,
  ear: Ear,
  users: Users,
  coffee: Coffee,
  puzzle: Puzzle,
  eye: Eye,
  activity: Activity
};
