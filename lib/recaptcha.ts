export async function verifyRecaptchaToken(token?: string): Promise<boolean> {
  if (!token) return false;

  try {
    const secretKey = process.env.RECAPTCHA_SECRET_KEY;
    if (!secretKey) {
      console.error("Missing RECAPTCHA_SECRET_KEY in environment variables");
      return false;
    }

    const response = await fetch(
      "https://www.google.com/recaptcha/api/siteverify",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/x-www-form-urlencoded",
        },
        body: new URLSearchParams({
          secret: secretKey,
          response: token,
        }),
      },
    );

    const data = await response.json();
    return Boolean(data.success);
  } catch (error) {
    console.error("reCAPTCHA verification error:", error);
    return false;
  }
}
