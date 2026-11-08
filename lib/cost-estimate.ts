// Monthly cost estimate for a listing (room detail simulator, saved listings).

// Estimated usage per household size.
const KWH_BY_PEOPLE: Record<number, number> = { 1: 80, 2: 140 }
const WATER_M3_PER_PERSON = 4
// Reference prices when the listing has no (or a zero/invalid) unit price.
const DEFAULT_ELECTRICITY_PER_KWH = 3_500
const DEFAULT_WATER_PER_PERSON = 100_000
const DEFAULT_WATER_PER_M3 = 20_000

export function isWaterPerPerson(waterType: unknown) {
  const t = String(waterType ?? '').toLowerCase()
  return t === 'person' || t === 'đầu người' || t.includes('người')
}

/** Positive finite number, or null. */
function price(v: unknown): number | null {
  const n = typeof v === 'string' ? Number(v) : (v as number)
  return typeof n === 'number' && Number.isFinite(n) && n > 0 ? n : null
}

/** Optional fee: missing/invalid counts as 0 (free). */
function fee(v: unknown): number {
  return price(v) ?? 0
}

export function estimateMonthlyCost(listing: any, people: number) {
  const rent = fee(listing.rent)
  const kwh = KWH_BY_PEOPLE[people] ?? 80 + (people - 1) * 60

  const listedElectricity = price(listing.electricity)
  const electricityPrice = listedElectricity ?? DEFAULT_ELECTRICITY_PER_KWH
  const electricity = kwh * electricityPrice

  const perPerson = isWaterPerPerson(listing.waterType)
  const listedWater = price(listing.water)
  const waterPrice = listedWater ?? (perPerson ? DEFAULT_WATER_PER_PERSON : DEFAULT_WATER_PER_M3)
  const waterM3 = WATER_M3_PER_PERSON * people
  const water = perPerson ? waterPrice * people : waterM3 * waterPrice

  const fixedFees = fee(listing.managementFee) + fee(listing.internet) + fee(listing.sanitation) + fee(listing.parkingBike)

  return {
    rent,
    kwh,
    electricityPrice,
    electricity,
    waterPrice,
    waterM3,
    water,
    fixedFees,
    total: rent + electricity + water + fixedFees,
    usedDefaults: listedElectricity === null || listedWater === null,
  }
}
