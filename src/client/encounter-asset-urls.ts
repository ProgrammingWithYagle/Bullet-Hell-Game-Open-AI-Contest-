/** Load the same selected atlas that supplies pose/frame metadata. */
export function resolveEncounterAssetUrls(
  clips: readonly { bossId: string; atlas: string }[],
  urls: Record<string, string>,
) {
  const selected: Record<string, string> = {};
  for (const clip of clips) {
    if (selected[clip.bossId])
      throw Error("Duplicate encounter atlas identity: " + clip.bossId);
    const url = urls["../../" + clip.atlas];
    if (!url)
      throw Error(
        "Missing selected encounter atlas URL: " +
          clip.bossId +
          " " +
          clip.atlas,
      );
    selected[clip.bossId] = url;
  }
  return selected;
}
