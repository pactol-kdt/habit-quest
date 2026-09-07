"use server";

import {
  getSession,
  signIn,
  signOut,
  signUp,
  updateAccountDisplayName,
} from "~/lib/v1/identity";

export type { AuthUser } from "~/lib/auth/session-types";
export type { AuthCommandResult as AuthActionResult } from "~/lib/v1/identity";

export async function getSessionAction() {
  return getSession();
}

export async function signUpAction(
  emailInput: string,
  password: string,
  displayName = "",
) {
  return signUp(emailInput, password, displayName);
}

export async function signInAction(emailInput: string, password: string) {
  return signIn(emailInput, password);
}

export async function signOutAction() {
  return signOut();
}

export async function updateAccountDisplayNameAction(displayName: string) {
  return updateAccountDisplayName(displayName);
}
