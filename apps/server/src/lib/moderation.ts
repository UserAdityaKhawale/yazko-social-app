const blockedTerms = ["kill yourself", "slur", "nude leak", "doxx"];

export function moderateMessage(input: string) {
  const lowered = input.toLowerCase();
  const reasons = blockedTerms.filter((term) => lowered.includes(term));

  return {
    flagged: reasons.length > 0,
    reasons
  };
}

