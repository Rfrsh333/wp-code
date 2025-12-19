// Server-side reCAPTCHA verification

interface RecaptchaResponse {
  success: boolean;
  score?: number;
  action?: string;
  challenge_ts?: string;
  hostname?: string;
  "error-codes"?: string[];
}

export async function verifyRecaptcha(token: string): Promise<{
  success: boolean;
  score: number;
  error?: string;
}> {
  const secretKey = process.env.RECAPTCHA_SECRET_KEY;

  if (!secretKey) {
    console.error("[SECURITY] RECAPTCHA_SECRET_KEY not set - rejecting submission");
    return {
      success: false,
      score: 0,
      error: "reCAPTCHA niet geconfigureerd - neem contact op met de beheerder",
    };
  }

  try {
    const response = await fetch(
      "https://www.google.com/recaptcha/api/siteverify",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/x-www-form-urlencoded",
        },
        body: `secret=${secretKey}&response=${token}`,
      }
    );

    const data: RecaptchaResponse = await response.json();

    if (!data.success) {
      return {
        success: false,
        score: 0,
        error: data["error-codes"]?.join(", ") || "Verificatie mislukt",
      };
    }

    // reCAPTCHA v3 returns a score from 0.0 to 1.0
    // 1.0 is very likely a good interaction, 0.0 is very likely a bot
    const score = data.score || 0;

    // We consider scores below 0.5 as suspicious
    if (score < 0.5) {
      return {
        success: false,
        score,
        error: "Verdachte activiteit gedetecteerd",
      };
    }

    return { success: true, score };
  } catch (error) {
    console.error("reCAPTCHA verification error:", error);
    return {
      success: false,
      score: 0,
      error: "Verificatie fout",
    };
  }
}
