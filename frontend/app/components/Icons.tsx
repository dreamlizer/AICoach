import { ElementType } from "react";
import { Target, Stethoscope, Radar, Compass, Scissors, Map, Zap } from "lucide-react";
import { PoliticsRadarIcon } from "./PoliticsRadarIcon";

export const toolIconMap: Record<string, ElementType> = {
  grow: Target,
  "team-diagnosis": Stethoscope,
  "politics-radar": PoliticsRadarIcon,
  "integration-compass": Compass,
  "decision-razor": Scissors,
  "business-wargame": Map,
  "team-igniter": Zap,
  target: Target,
  stethoscope: Stethoscope,
  radar: PoliticsRadarIcon,
  compass: Compass,
  scissors: Scissors,
  map: Map,
  zap: Zap
};
