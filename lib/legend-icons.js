export const LEGEND_ICON_MAP = {
  Alter: '/legends/alter.webp',
  Ash: '/legends/ash.webp',
  Axle: '/legends/axle.webp',
  Ballistic: '/legends/ballistic.webp',
  Bangalore: '/legends/bangalore.webp',
  Bloodhound: '/legends/bloodhound.webp',
  Catalyst: '/legends/catalyst.webp',
  Caustic: '/legends/caustic.webp',
  Conduit: '/legends/conduit.webp',
  Crypto: '/legends/crypto.webp',
  Fuse: '/legends/fuse.webp',
  Gibraltar: '/legends/gibraltar.webp',
  Horizon: '/legends/horizon.webp',
  Lifeline: '/legends/lifeline.webp',
  Loba: '/legends/loba.webp',
  'Mad Maggie': '/legends/mad-maggie.webp',
  Mirage: '/legends/mirage.webp',
  Newcastle: '/legends/newcastle.webp',
  Octane: '/legends/octane.webp',
  Pathfinder: '/legends/pathfinder.webp',
  Rampart: '/legends/rampart.webp',
  Revenant: '/legends/revenant.webp',
  Seer: '/legends/seer.webp',
  Sparrow: '/legends/sparrow.webp',
  Valkyrie: '/legends/valkyrie.webp',
  Vantage: '/legends/vantage.webp',
  Wattson: '/legends/wattson.webp',
  Wraith: '/legends/wraith.webp',
}

export const LEGEND_PLACEHOLDER_ICON = '/legends/placeholder.svg'

export function resolveLegendIcon(name) {
  return LEGEND_ICON_MAP[name] || LEGEND_PLACEHOLDER_ICON
}
