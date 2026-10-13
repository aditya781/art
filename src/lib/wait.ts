/** Lets a sheet finish sliding away before the system picker or share sheet covers the screen. */
export function afterSheetCloses() {
  return new Promise<void>((resolve) => setTimeout(resolve, 240));
}
