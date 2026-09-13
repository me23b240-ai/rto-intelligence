// lib/rider-engine.ts
import { AttemptInput, VerificationResult, Settings } from "./types";

export function verifyAndPay(input: AttemptInput, settings: Settings): VerificationResult {
  let fairAllocationNote: string | null = null;
  if (input.farStopsThisShift >= settings.farStopCap) {
    fairAllocationNote = `This rider has already covered ${input.farStopsThisShift} far stops this shift - this stop was rotated to another rider.`;
  }

  // Confidence replaces a hard binary - real GPS/device signals are noisy,
  // so we express verification as a probability, not a pass/fail.
  let confidence = 0.5;
  confidence += input.inGeofence ? 0.3 : -0.3;
  confidence += input.deviceClean ? 0.2 : -0.2;
  confidence = Math.max(0, Math.min(1, Math.round(confidence * 100) / 100));

  let status: VerificationResult["status"];
  if (confidence >= 0.75) status = "verified";
  else if (confidence >= 0.4) status = "fallback_photo";
  else status = "flagged_review";

  const base = settings.basePay;
  const distanceAddOn = Math.max(0, input.distanceKm - settings.baseKmCovered) * settings.perKmRate;
  const difficultyWeight = input.addressDifficulty === "hard" ? settings.hardAddressBonus : 0;
  const returnBonus = input.distanceKm > settings.farStopThreshold ? settings.farStopBonus : 0;
  const reattemptBonus = input.attemptNumber > 1 ? settings.reattemptBonus : 0;
  const payout = Math.round((base + distanceAddOn + difficultyWeight + returnBonus + reattemptBonus) * 100) / 100;

  return {
    status,
    confidence,
    payout,
    breakdown: {
      base,
      distanceAddOn: Math.round(distanceAddOn * 100) / 100,
      difficultyWeight,
      returnBonus,
      reattemptBonus,
    },
    fairAllocationNote,
  };
}