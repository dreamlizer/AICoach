"use client";

import { useCallback, useEffect, useState } from "react";
import { getGreeting } from "@/lib/greetings";
import { latestVersion } from "@/lib/release_notes";

export function useHomePresentation(params: {
  userName?: string;
  activeToolId: string | null;
  toolsPanelOpen: boolean;
  assessmentPanelOpen: boolean;
  toolboxSlogans: [string, string][];
  assessmentSlogans: [string, string][];
  defaultSlogan: [string, string];
  splitSloganContent: (content: string) => [string, string];
}) {
  const {
    userName,
    activeToolId,
    toolsPanelOpen,
    assessmentPanelOpen,
    toolboxSlogans,
    assessmentSlogans,
    defaultSlogan,
    splitSloganContent,
  } = params;

  const [showReleaseNotes, setShowReleaseNotes] = useState(false);
  const [showMagicZone, setShowMagicZone] = useState(false);
  const [randomQuestions, setRandomQuestions] = useState<string[]>([]);
  const [greeting, setGreeting] = useState<{ title: string; content: string } | null>(null);
  const [sloganLines, setSloganLines] = useState<[string, string]>(defaultSlogan);

  useEffect(() => {
    const stored = localStorage.getItem("showMagicZone");
    if (stored === "true") setShowMagicZone(true);
  }, []);

  useEffect(() => {
    if (toolsPanelOpen) {
      setSloganLines(toolboxSlogans[Math.floor(Math.random() * toolboxSlogans.length)]);
      return;
    }

    if (assessmentPanelOpen) {
      setSloganLines(assessmentSlogans[Math.floor(Math.random() * assessmentSlogans.length)]);
      return;
    }

    if (!activeToolId && greeting) {
      setSloganLines(splitSloganContent(greeting.content));
    }
  }, [toolsPanelOpen, assessmentPanelOpen, activeToolId, greeting, toolboxSlogans, assessmentSlogans, splitSloganContent]);

  useEffect(() => {
    if (!userName) return;
    setGreeting((prev) => {
      if (!prev) return prev;

      const normalizedTitle = prev.title.replace(/[,，]/g, "，");
      const dividerIndex = normalizedTitle.indexOf("，");
      const suffix = dividerIndex === -1 ? normalizedTitle.trim() : normalizedTitle.slice(dividerIndex + 1).trim();
      const nextTitle = suffix ? `${userName}，${suffix}` : userName;

      return prev.title === nextTitle ? prev : { ...prev, title: nextTitle };
    });
  }, [userName]);

  const initializeGreeting = useCallback(() => {
    const greetingData = getGreeting();
    setGreeting(greetingData);
    setSloganLines(splitSloganContent(greetingData.content));
  }, [splitSloganContent]);

  const openReleaseNotesIfNeeded = useCallback(() => {
    const lastSeenVersion = localStorage.getItem("last_seen_version");
    if (lastSeenVersion !== latestVersion) {
      setShowReleaseNotes(true);
    }
  }, []);

  return {
    showReleaseNotes,
    setShowReleaseNotes,
    showMagicZone,
    setShowMagicZone,
    randomQuestions,
    setRandomQuestions,
    greeting,
    setGreeting,
    sloganLines,
    setSloganLines,
    initializeGreeting,
    openReleaseNotesIfNeeded,
  };
}
