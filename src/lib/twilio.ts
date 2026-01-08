import twilio from 'twilio';

// Initialize Twilio client lazily to avoid build-time errors
let client: ReturnType<typeof twilio> | null = null;

function getClient() {
  if (!client) {
    const accountSid = process.env.TWILIO_ACCOUNT_SID;
    const authToken = process.env.TWILIO_AUTH_TOKEN;

    if (!accountSid || !authToken) {
      throw new Error('Twilio credentials not configured');
    }

    client = twilio(accountSid, authToken);
  }
  return client;
}

const verifyServiceSid = process.env.TWILIO_VERIFY_SERVICE_SID;

export async function sendVerificationCode(phone: string): Promise<boolean> {
  try {
    if (!verifyServiceSid) {
      console.error('TWILIO_VERIFY_SERVICE_SID not configured');
      // In development, we'll simulate success
      if (process.env.NODE_ENV === 'development') {
        console.log(`[DEV] Would send verification to ${phone}`);
        return true;
      }
      return false;
    }

    await getClient().verify.v2
      .services(verifyServiceSid)
      .verifications.create({ to: phone, channel: 'sms' });
    return true;
  } catch (error) {
    console.error('Failed to send verification:', error);
    return false;
  }
}

export async function checkVerificationCode(phone: string, code: string): Promise<boolean> {
  try {
    if (!verifyServiceSid) {
      // In development, accept any 6-digit code
      if (process.env.NODE_ENV === 'development') {
        console.log(`[DEV] Checking code ${code} for ${phone}`);
        return code.length === 6 && /^\d+$/.test(code);
      }
      return false;
    }

    const verification = await getClient().verify.v2
      .services(verifyServiceSid)
      .verificationChecks.create({ to: phone, code });
    return verification.status === 'approved';
  } catch (error) {
    console.error('Failed to check verification:', error);
    return false;
  }
}

export async function sendSMS(phone: string, message: string): Promise<string | null> {
  try {
    const phoneNumber = process.env.TWILIO_PHONE_NUMBER;

    if (!phoneNumber) {
      // In development, simulate success
      if (process.env.NODE_ENV === 'development') {
        console.log(`[DEV] Would send SMS to ${phone}: ${message}`);
        return 'dev-sid';
      }
      return null;
    }

    const result = await getClient().messages.create({
      body: message,
      from: phoneNumber,
      to: phone,
    });
    return result.sid;
  } catch (error) {
    console.error('Failed to send SMS:', error);
    return null;
  }
}
