// Downloaded originals are kept separate from catalog.json: an older open
// application may still save its previous copy while downloading another room.
function applyLocalModels(assets, overrides = {}) {
  for (const asset of assets) {
    const local = overrides[asset.id];
    if (!local || typeof local.model !== 'string' || !/^[a-zA-Z0-9_-]+\.glb$/.test(local.model)) continue;
    asset.model = local.model;
    if (Number.isFinite(local.modelScale) && local.modelScale > 0) asset.modelScale = local.modelScale;
    asset.download = { status: 'ready', note: 'Lokaal beschikbaar; gratis gedownload bij Sketchfab.' };
    if (typeof local.notes === 'string') asset.notes = local.notes;
  }
  return assets;
}
module.exports = { applyLocalModels };
