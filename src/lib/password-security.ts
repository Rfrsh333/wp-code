import crypto from "crypto";

/**
 * Check if a password has been leaked using HaveIBeenPwned API (k-Anonymity model)
 *
 * This uses the k-Anonymity model which means:
 * - Only the first 5 characters of the SHA-1 hash are sent to the API
 * - The full password is NEVER sent over the network
 * - Privacy-friendly and secure
 *
 * @param password - The password to check
 * @returns Promise<boolean> - true if leaked, false if safe
 * @throws Error if API is unavailable
 */
export async function isPasswordLeaked(password: string): Promise<boolean> {
  try {
    // 1. Hash the password with SHA-1
    const sha1Hash = crypto
      .createHash("sha1")
      .update(password)
      .digest("hex")
      .toUpperCase();

    // 2. Split hash into prefix (first 5 chars) and suffix (rest)
    const hashPrefix = sha1Hash.substring(0, 5);
    const hashSuffix = sha1Hash.substring(5);

    // 3. Query HaveIBeenPwned API with only the prefix
    const response = await fetch(
      `https://api.pwnedpasswords.com/range/${hashPrefix}`,
      {
        method: "GET",
        headers: {
          "User-Agent": "TopTalent-Security-Check",
        },
        // Timeout after 5 seconds
        signal: AbortSignal.timeout(5000),
      }
    );

    if (!response.ok) {
      // If API is down, log warning but don't block registration
      console.warn("[password-security] HaveIBeenPwned API error:", response.status);
      return false; // Fail open - allow registration
    }

    // 4. Get list of all hash suffixes that match the prefix
    const responseText = await response.text();
    const hashes = responseText.split("\n");

    // 5. Check if our hash suffix is in the list
    for (const line of hashes) {
      const [suffix] = line.split(":");
      if (suffix === hashSuffix) {
        return true; // Password is leaked!
      }
    }

    return false; // Password is safe
  } catch (error) {
    // If check fails (network error, timeout, etc.), log but don't block
    console.warn("[password-security] Failed to check password:", error);
    return false; // Fail open - allow registration
  }
}

/**
 * Validate password strength and security
 *
 * @param password - The password to validate
 * @returns Object with validation result
 */
export async function validatePasswordSecurity(
  password: string
): Promise<{ valid: boolean; error?: string }> {
  // 1. Length check
  if (password.length < 8) {
    return { valid: false, error: "Wachtwoord moet minimaal 8 tekens bevatten" };
  }

  // 2. Check for common weak patterns
  const weakPatterns = [
    /^12345678/,
    /^password/i,
    /^qwerty/i,
    /^abc12345/i,
  ];

  for (const pattern of weakPatterns) {
    if (pattern.test(password)) {
      return {
        valid: false,
        error: "Dit wachtwoord is te zwak. Kies een complexer wachtwoord.",
      };
    }
  }

  // 3. Check against HaveIBeenPwned
  const isLeaked = await isPasswordLeaked(password);
  if (isLeaked) {
    return {
      valid: false,
      error: "Dit wachtwoord is gelekt in een datalek en mag niet gebruikt worden. Kies een ander wachtwoord.",
    };
  }

  // 4. All checks passed
  return { valid: true };
}
