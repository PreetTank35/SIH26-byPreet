/**
 * SMS Dispatch Gateway Interface
 * Supports Console Logger for dev & ready hooks for Twilio / Fast2SMS / MSG91
 */

async function sendSms(phone, message, otp = null) {
  const provider = process.env.SMS_PROVIDER || 'console';

  if (provider === 'twilio' && process.env.TWILIO_ACCOUNT_SID) {
    // Production Twilio integration hook
    try {
      const client = require('twilio')(process.env.TWILIO_ACCOUNT_SID, process.env.TWILIO_AUTH_TOKEN);
      const cleanDigits = phone.replace(/\D/g, '');
      const formattedTo = phone.startsWith('+') ? phone : (cleanDigits.length === 10 ? `+91${cleanDigits}` : `+${cleanDigits}`);
      const res = await client.messages.create({
        body: message,
        from: process.env.TWILIO_PHONE_NUMBER,
        to: formattedTo
      });
      console.log(`[SMS-Twilio] Dispatched successfully to ${formattedTo} (SID: ${res.sid})`);
      return { success: true, provider: 'twilio', sid: res.sid };
    } catch (err) {
      console.error('[SMS-Twilio Error]', err.message);
      // Fallback to console log
    }
  }

  // Development / Standard Terminal OTP Logger:
  const extractedOtp = otp || (message && message.match(/\b\d{6}\b/) ? message.match(/\b\d{6}\b/)[0] : null);

  console.log(`\n======================================================================`);
  console.log(`  🔐 [MEDIKIOSK TERMINAL OTP DISPATCH] (Twilio Deactivated)`);
  console.log(`======================================================================`);
  console.log(`  📱 Phone Number : +91-${phone}`);
  if (extractedOtp) {
    console.log(`  🔑 OTP CODE     : >>> [ ${extractedOtp} ] <<<`);
  }
  console.log(`  💬 SMS Message  : "${message}"`);
  console.log(`  ⏰ Timestamp    : ${new Date().toLocaleTimeString()} (Valid for 5 minutes)`);
  console.log(`======================================================================\n`);

  return { success: true, provider: 'console', otp: extractedOtp };
}

module.exports = {
  sendSms
};
