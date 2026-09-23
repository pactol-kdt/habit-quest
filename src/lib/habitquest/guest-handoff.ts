/** What to do when the signed-in account has no cloud save yet. */
export function emptyCloudHandoff(options: { discardGuest?: boolean }): "install-fresh" | "migrate-local" {
  return options.discardGuest ? "install-fresh" : "migrate-local";
}
