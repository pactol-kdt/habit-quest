"use client";

import { useEffect, useState } from "react";
import { HabitFormModal } from "~/components/habitquest/habit-form-modal";
import { TutorialModal } from "~/components/habitquest/tutorial-modal";
import { TUTORIAL_REPLAY_EVENT } from "~/lib/habitquest/tutorial";
import { useHabitQuestStore } from "~/store/habitquest-store";
import type { StarterHabitKey } from "~/types/habitquest";

export function OnboardingModal() {
  const hydrated = useHabitQuestStore((state) => state.hydrated);
  const onboardingCompleted = useHabitQuestStore((state) => state.settings.onboardingCompleted);
  const displayName = useHabitQuestStore((state) => state.settings.displayName);
  const completeOnboarding = useHabitQuestStore((state) => state.completeOnboarding);
  const createHabit = useHabitQuestStore((state) => state.createHabit);
  const habits = useHabitQuestStore((state) => state.habits);
  const [replayOpen, setReplayOpen] = useState(false);
  const [habitModalOpen, setHabitModalOpen] = useState(false);

  const firstRun = hydrated && !onboardingCompleted;
  const tutorialOpen = firstRun || replayOpen;
  const mode = firstRun ? "onboarding" : "replay";

  useEffect(() => {
    function handleReplay() {
      setReplayOpen(true);
    }
    window.addEventListener(TUTORIAL_REPLAY_EVENT, handleReplay);
    return () => window.removeEventListener(TUTORIAL_REPLAY_EVENT, handleReplay);
  }, []);

  async function handleFinish(
    name: string,
    choice: { starterKeys: StarterHabitKey[]; createOwn: boolean },
  ) {
    if (!onboardingCompleted) {
      const ready = await completeOnboarding(name, choice.starterKeys);
      if (!ready) {
        return;
      }
    }
    setReplayOpen(false);
    if (choice.createOwn) {
      setHabitModalOpen(true);
    }
  }

  return (
    <>
      <TutorialModal
        open={tutorialOpen}
        mode={mode}
        hasHabits={habits.length > 0}
        initialName={displayName}
        onFinish={handleFinish}
      />
      <HabitFormModal
        open={habitModalOpen}
        habit={null}
        habits={habits}
        onClose={() => setHabitModalOpen(false)}
        onSubmit={(values) => {
          createHabit(values);
          setHabitModalOpen(false);
        }}
      />
    </>
  );
}
