export const PET_NAME = "Kip";

export const PET_STAGES = [
  { id: "egg", label: "Egg", article: "an", at: 0 },
  { id: "hatchling", label: "Hatchling", article: "a", at: 1 },
  { id: "scout", label: "Scout", article: "a", at: 10 },
  { id: "keeper", label: "Keeper", article: "a", at: 30 },
  { id: "warden", label: "Warden", article: "a", at: 100 },
  { id: "elder", label: "Elder", article: "an", at: 300 },
] as const;

export type PetStage = (typeof PET_STAGES)[number];
export type PetStageId = PetStage["id"];

export function getPetStage(completions: number): PetStage {
  const count = Math.max(0, Math.floor(completions));
  let stage: PetStage = PET_STAGES[0];
  for (const entry of PET_STAGES) {
    if (count >= entry.at) {
      stage = entry;
    }
  }
  return stage;
}

export function getPetStageById(id: string) {
  return PET_STAGES.find((stage) => stage.id === id) ?? null;
}

export function getPetProgress(completions: number) {
  const count = Math.max(0, Math.floor(completions));
  const stage = getPetStage(count);
  const index = PET_STAGES.findIndex((entry) => entry.id === stage.id);
  const next = PET_STAGES[index + 1] ?? null;
  return {
    count,
    stage,
    next,
    target: next?.at ?? null,
  };
}

export function petCountLabel(completions: number) {
  const progress = getPetProgress(completions);
  if (progress.target === null) {
    return `${progress.count} finished`;
  }
  return `${progress.count} of ${progress.target}`;
}

/** The form landed on when the count rises. Undo and a same-form finish return null. */
export function petStageAdvanced(before: number, after: number) {
  if (after <= before) {
    return null;
  }
  const from = getPetStage(before);
  const to = getPetStage(after);
  if (from.id === to.id || to.id === "egg") {
    return null;
  }
  return to;
}
