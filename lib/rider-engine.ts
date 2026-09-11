// lib/rider-engine.ts
import { AttemptInput, VerificationResult, Settings } from "./types";

export function verifyAndPay(input: AttemptInput, settings: Settings): VerificationResult {
  let fairAllocationNote: string | null = null;
  if (input.farStopsThisShift >= settings.farStopCap) {
    fairAllocationNote = `This rider has already covered ${input.farStopsThisShift} far stops this shift - next far stop would rotate to another rider.`;
  }

  let status: VerificationResult["status"];
  if (!input.inGeofence && !input.deviceClean) {
    status = "flagged_review";
  } else if (!input.inGeofence || !input.deviceClean) {
    status = "fallback_photo";
  } else {
    status = "verified";
  }

  const base = settings.basePay;
  const distanceAddOn = Math.max(0, input.distanceKm - settings.baseKmCovered) * settings.perKmRate;
  const difficultyWeight = input.addressDifficulty === "hard" ? settings.hardAddressBonus : 0;
  const returnBonus = input.distanceKm > settings.farStopThreshold ? settings.farStopBonus : 0;
  const payout = Math.round((base + distanceAddOn + difficultyWeight + returnBonus) * 100) / 100;

  return {
    status,
    payout,
    breakdown: { base, distanceAddOn: Math.round(distanceAddOn * 100) / 100, difficultyWeight, returnBonus },
    fairAllocationNote,
  };
}