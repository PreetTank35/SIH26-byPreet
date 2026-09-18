/**
 * ABHA/ABDM Mock Service
 * 
 * Since real ABHA ABDM APIs are not available yet, this service returns
 * hardcoded patient medical history. In production, this would integrate
 * with the Ayushman Bharat Digital Mission (ABDM) Health Information Exchange.
 */

/**
 * Mock: Verify ABHA credentials and return patient info
 * In production, this would call ABDM APIs to verify ABHA number/address
 * @param {string} abhaIdentifier - ABHA number, address, or linked mobile
 * @param {string} identifierType - 'abha_number' | 'abha_address' | 'mobile'
 */
async function verifyAbhaIdentifier(abhaIdentifier, identifierType = 'auto') {
  // Simulate network delay for ABDM Gateway call
  await new Promise(resolve => setTimeout(resolve, 350));

  if (!abhaIdentifier || !abhaIdentifier.trim()) {
    throw new Error('Please enter a valid ABHA Number, ABHA Address, or Mobile Number');
  }

  const raw = abhaIdentifier.trim();
  const digitsOnly = raw.replace(/\D/g, '');
  const lower = raw.toLowerCase();

  // Primary Mock Database of ABHA profiles
  const profiles = [
    {
      abha_number: '91-8844-3322-1100',
      clean_abha: '91884433221100',
      abha_address: 'ramesh.kumar@abdm',
      name: 'Ramesh Kumar',
      age: 45,
      gender: 'Male',
      phone: '9876543210',
      address: 'Ward 12, Civil Lines, Central District',
      blood_group: 'B+',
      dob: '1981-03-15'
    },
    {
      abha_number: '91-7766-5544-3322',
      clean_abha: '91776655443322',
      abha_address: 'sunita.devi@abdm',
      name: 'Sunita Devi',
      age: 35,
      gender: 'Female',
      phone: '9988776655',
      address: 'Mohalla Naya Bazar, Tehsil Road',
      blood_group: 'O+',
      dob: '1991-08-22'
    },
    {
      abha_number: '91-5544-3322-9988',
      clean_abha: '91554433229988',
      abha_address: 'amit.sharma@abdm',
      name: 'Amit Sharma',
      age: 28,
      gender: 'Male',
      phone: '9123456780',
      address: 'Block B, Sector 4, Civil Station',
      blood_group: 'A+',
      dob: '1998-05-10'
    }
  ];

  // 1. Check match by 10-digit phone
  let matched = null;
  if (digitsOnly.length === 10) {
    matched = profiles.find(p => p.phone === digitsOnly);
  }

  // 2. Check match by 14-digit ABHA number
  if (!matched && digitsOnly.length === 14) {
    matched = profiles.find(p => p.clean_abha === digitsOnly || p.abha_number === raw);
  }

  // 3. Check match by ABHA address
  if (!matched && lower.includes('@')) {
    matched = profiles.find(p => p.abha_address === lower || p.abha_address.split('@')[0] === lower.split('@')[0]);
  }

  if (matched) {
    return {
      verified: true,
      profile: matched,
      detected_type: digitsOnly.length === 10 ? 'mobile' : digitsOnly.length === 14 ? 'abha_number' : 'abha_address',
      linked_phone: matched.phone,
      message: `ABHA identity verified for ${matched.name} (${matched.abha_number}). OTP sent to linked mobile +91-${matched.phone.slice(0, 2)}****${matched.phone.slice(-2)}.`
    };
  }

  // 4. Dynamic realistic fallback for any user-entered mobile or ABHA ID
  const fallbackPhone = digitsOnly.length >= 10 ? digitsOnly.slice(-10) : '9876543210';
  const dynamicName = lower.includes('@') 
    ? lower.split('@')[0].replace(/[._]/g, ' ').replace(/\b\w/g, l => l.toUpperCase()) 
    : 'Rohan Verma';

  const dynamicProfile = {
    abha_number: digitsOnly.length === 14 ? `${digitsOnly.slice(0, 2)}-${digitsOnly.slice(2, 6)}-${digitsOnly.slice(6, 10)}-${digitsOnly.slice(10, 14)}` : `91-4455-6677-${Math.floor(1000 + Math.random() * 9000)}`,
    abha_address: lower.includes('@') ? lower : `${dynamicName.toLowerCase().replace(/\s+/g, '.')}@abdm`,
    name: dynamicName,
    age: 32,
    gender: 'Male',
    phone: fallbackPhone,
    address: 'District Civil Hospital OPD Area',
    blood_group: 'B+',
    dob: '1994-06-18'
  };

  return {
    verified: true,
    profile: dynamicProfile,
    detected_type: digitsOnly.length === 10 ? 'mobile' : digitsOnly.length === 14 ? 'abha_number' : 'abha_address',
    linked_phone: fallbackPhone,
    message: `ABHA identity verified for ${dynamicProfile.name} (${dynamicProfile.abha_number}). OTP sent to linked mobile +91-${fallbackPhone.slice(0, 2)}****${fallbackPhone.slice(-2)}.`
  };
}

/**
 * Mock: Fetch patient medical history from ABDM Health Information Exchange
 * In production: This would call ABDM HIP/HIU APIs to fetch linked health records
 * @param {string} abhaNumber - Patient's ABHA number
 */
async function fetchAbhaHistory(abhaNumber) {
  // Simulate API delay
  await new Promise(resolve => setTimeout(resolve, 500));

  // Hardcoded medical history for demo patients
  const mockHistories = {
    '91-8844-3322-1100': [
      {
        date: '2026-06-10',
        hospital: 'District Civil Hospital, Jaipur',
        department: 'General Medicine',
        diagnosis: 'Acute viral fever with myalgia',
        chief_complaint: 'High grade fever for 3 days with severe body ache',
        prescription: 'Tab. Paracetamol 650mg (1-0-1 x 5 days), Tab. Cetirizine 10mg (0-0-1 x 3 days), Adequate rest and hydration advised',
        vitals: { bp: '120/80', temp: '102.4°F', pulse: '98 bpm', spo2: '97%' },
        doctor: 'Dr. K. N. Gupta (MD General Medicine)',
        follow_up: '2026-06-15'
      },
      {
        date: '2026-03-22',
        hospital: 'PHC Sanganer',
        department: 'AYUSH (Ayurveda)',
        diagnosis: 'Sandhivata (Osteoarthritis) — bilateral knee',
        chief_complaint: 'Chronic knee joint pain and stiffness, worse in mornings',
        prescription: 'Yograj Guggulu 2 tabs BD, Maharasnadi Kwath 15ml BD before food, Abhyanga + Swedana (external Panchakarma therapy recommended)',
        vitals: { bp: '130/85', temp: '98.6°F', pulse: '78 bpm' },
        doctor: 'Vd. Priya Sharma (BAMS, MD Kayachikitsa)',
        follow_up: '2026-04-22'
      },
      {
        date: '2025-11-08',
        hospital: 'District Civil Hospital, Jaipur',
        department: 'General Medicine',
        diagnosis: 'Gastroesophageal Reflux Disease (GERD)',
        chief_complaint: 'Persistent acidity, burning sensation after meals for 2 weeks',
        prescription: 'Tab. Pantoprazole 40mg (1-0-0 before food x 14 days), Syp. Sucralfate 10ml TDS, Bland diet advised',
        vitals: { bp: '118/76', temp: '98.2°F', pulse: '72 bpm', spo2: '98%' },
        doctor: 'Dr. Vikram Singh (MD Medicine)',
        follow_up: '2025-11-22'
      }
    ],
    '91-7766-5544-3322': [
      {
        date: '2026-08-05',
        hospital: 'CHC Mansarovar',
        department: 'General Medicine',
        diagnosis: 'Iron deficiency anemia',
        chief_complaint: 'Weakness, fatigue, and dizziness for 1 month',
        prescription: 'Tab. Ferrous Sulphate + Folic Acid (1-0-0 x 30 days), Tab. Vitamin C 500mg (1-0-0 x 30 days), Iron-rich diet counseling',
        vitals: { bp: '100/65', temp: '98.4°F', pulse: '88 bpm', spo2: '97%', hb: '8.2 g/dL' },
        doctor: 'Dr. Meena Rao (MD Medicine)',
        follow_up: '2026-09-05'
      }
    ]
  };

  const history = mockHistories[abhaNumber] || [];

  return {
    abha_number: abhaNumber,
    record_count: history.length,
    records: history,
    source: 'ABDM Health Information Exchange (Mock/MVP)',
    disclaimer: 'This is simulated ABDM data for MVP demonstration. Real ABDM integration requires HIP/HIU registration and consent framework.'
  };
}

module.exports = {
  verifyAbhaIdentifier,
  fetchAbhaHistory
};
