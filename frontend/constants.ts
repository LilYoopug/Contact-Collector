
import { Contact, ConsentStatus, Source, User, UserRole } from './types';

const getDateAgo = (daysAgo: number): Date => {
  const date = new Date();
  date.setDate(date.getDate() - daysAgo);
  return date;
};

export const MOCK_USERS: User[] = [
  { id: 'u1', fullName: 'John Doe', email: 'john@example.com', phone: '+628123456789', role: UserRole.USER, joinedAt: getDateAgo(30), totalContacts: 142 },
  { id: 'u2', fullName: 'Admin Master', email: 'admin@collector.com', phone: '+628998877665', role: UserRole.ADMIN, joinedAt: getDateAgo(60), totalContacts: 0 },
  { id: 'u3', fullName: 'Jane Smith', email: 'jane@global.com', phone: '+14155550192', role: UserRole.USER, joinedAt: getDateAgo(15), totalContacts: 89 },
  { id: 'u4', fullName: 'Dewi Lestari', email: 'dewi.l@tech.id', phone: '+628212345678', role: UserRole.USER, joinedAt: getDateAgo(5), totalContacts: 45 },
  { id: 'u5', fullName: 'Robert Brown', email: 'robert@brown.co', phone: '+447700900123', role: UserRole.USER, joinedAt: getDateAgo(40), totalContacts: 210 },
  { id: 'u6', fullName: 'Alice Wong', email: 'alice.w@agency.com', phone: '+85291234567', role: UserRole.USER, joinedAt: getDateAgo(20), totalContacts: 12 },
  { id: 'u7', fullName: 'Ferry Salim', email: 'ferry@startup.io', phone: '+62811888999', role: UserRole.USER, joinedAt: getDateAgo(2), totalContacts: 5 },
  { id: 'u8', fullName: 'Sarah Connor', email: 'sarah@resistance.com', phone: '+12135550101', role: UserRole.ADMIN, joinedAt: getDateAgo(365), totalContacts: 1500 },
  { id: 'u9', fullName: 'Taufik Hidayat', email: 'taufik@sports.id', phone: '+6285712344321', role: UserRole.USER, joinedAt: getDateAgo(10), totalContacts: 33 },
  { id: 'u10', fullName: 'Elena Gilbert', email: 'elena@mystic.com', phone: '+15556667777', role: UserRole.USER, joinedAt: getDateAgo(25), totalContacts: 67 },
  { id: 'u11', fullName: 'Michael Scott', email: 'm.scott@dundermifflin.com', phone: '+15705550111', role: UserRole.USER, joinedAt: getDateAgo(12), totalContacts: 44 },
  { id: 'u12', fullName: 'Pam Beesly', email: 'pam@dundermifflin.com', phone: '+15705550112', role: UserRole.USER, joinedAt: getDateAgo(14), totalContacts: 156 },
  { id: 'u13', fullName: 'Jim Halpert', email: 'jim@dundermifflin.com', phone: '+15705550113', role: UserRole.USER, joinedAt: getDateAgo(14), totalContacts: 230 },
  { id: 'u14', fullName: 'Dwight Schrute', email: 'dwight@dundermifflin.com', phone: '+15705550114', role: UserRole.USER, joinedAt: getDateAgo(45), totalContacts: 890 },
  { id: 'u15', fullName: 'Angela Martin', email: 'angela@dundermifflin.com', phone: '+15705550115', role: UserRole.USER, joinedAt: getDateAgo(30), totalContacts: 12 },
  { id: 'u16', fullName: 'Kevin Malone', email: 'kevin@dundermifflin.com', phone: '+15705550116', role: UserRole.USER, joinedAt: getDateAgo(20), totalContacts: 4 },
  { id: 'u17', fullName: 'Oscar Martinez', email: 'oscar@dundermifflin.com', phone: '+15705550117', role: UserRole.USER, joinedAt: getDateAgo(22), totalContacts: 88 },
  { id: 'u18', fullName: 'Stanley Hudson', email: 'stanley@dundermifflin.com', phone: '+15705550118', role: UserRole.USER, joinedAt: getDateAgo(50), totalContacts: 120 },
  { id: 'u19', fullName: 'Phyllis Vance', email: 'phyllis@dundermifflin.com', phone: '+15705550119', role: UserRole.USER, joinedAt: getDateAgo(33), totalContacts: 65 },
  { id: 'u20', fullName: 'Ryan Howard', email: 'ryan@dundermifflin.com', phone: '+15705550120', role: UserRole.USER, joinedAt: getDateAgo(1), totalContacts: 2 },
  { id: 'u21', fullName: 'Kelly Kapoor', email: 'kelly@dundermifflin.com', phone: '+15705550121', role: UserRole.USER, joinedAt: getDateAgo(3), totalContacts: 19 },
  { id: 'u22', fullName: 'Toby Flenderson', email: 'toby@dundermifflin.com', phone: '+15705550122', role: UserRole.USER, joinedAt: getDateAgo(100), totalContacts: 31 },
  { id: 'u23', fullName: 'Creed Bratton', email: 'creed@dundermifflin.com', phone: '+15705550123', role: UserRole.USER, joinedAt: getDateAgo(500), totalContacts: 0 },
  { id: 'u24', fullName: 'Meredith Palmer', email: 'meredith@dundermifflin.com', phone: '+15705550124', role: UserRole.USER, joinedAt: getDateAgo(40), totalContacts: 10 },
  { id: 'u25', fullName: 'Andy Bernard', email: 'andy@dundermifflin.com', phone: '+15705550125', role: UserRole.USER, joinedAt: getDateAgo(18), totalContacts: 42 },
  { id: 'u26', fullName: 'Erin Hannon', email: 'erin@dundermifflin.com', phone: '+15705550126', role: UserRole.USER, joinedAt: getDateAgo(15), totalContacts: 55 },
  { id: 'u27', fullName: 'Gabe Lewis', email: 'gabe@sabre.com', phone: '+15705550127', role: UserRole.USER, joinedAt: getDateAgo(12), totalContacts: 22 },
  { id: 'u28', fullName: 'Robert California', email: 'robert.c@sabre.com', phone: '+15705550128', role: UserRole.USER, joinedAt: getDateAgo(11), totalContacts: 111 },
  { id: 'u29', fullName: 'Nellie Bertram', email: 'nellie@sabre.com', phone: '+15705550129', role: UserRole.USER, joinedAt: getDateAgo(10), totalContacts: 9 },
  { id: 'u30', fullName: 'Clark Green', email: 'clark@dundermifflin.com', phone: '+15705550130', role: UserRole.USER, joinedAt: getDateAgo(5), totalContacts: 14 },
  { id: 'u31', fullName: 'Pete Miller', email: 'pete@dundermifflin.com', phone: '+15705550131', role: UserRole.USER, joinedAt: getDateAgo(4), totalContacts: 27 },
  { id: 'u32', fullName: 'Darryl Philbin', email: 'darryl@dundermifflin.com', phone: '+15705550132', role: UserRole.USER, joinedAt: getDateAgo(70), totalContacts: 340 },
  { id: 'u33', fullName: 'Jan Levinson', email: 'jan@corporate.com', phone: '+15705550133', role: UserRole.ADMIN, joinedAt: getDateAgo(400), totalContacts: 2500 },
  { id: 'u34', fullName: 'David Wallace', email: 'david@corporate.com', phone: '+15705550134', role: UserRole.ADMIN, joinedAt: getDateAgo(450), totalContacts: 0 },
  { id: 'u35', fullName: 'Jo Bennett', email: 'jo@sabre.com', phone: '+15705550135', role: UserRole.ADMIN, joinedAt: getDateAgo(300), totalContacts: 5000 },
];

export const MOCK_CONTACTS: Contact[] = [
  { id: '1', fullName: 'Budi Santoso', phone: '6281234567890', email: 'budi.santoso@example.com', company: 'PT Maju Mundur', jobTitle: 'Sales Manager', source: Source.Import, consent: ConsentStatus.OptIn, createdAt: getDateAgo(1) },
  { id: '2', fullName: 'Citra Lestari', phone: '6281298765432', email: 'citra.lestari@example.com', company: 'Warung Kopi Digital', jobTitle: 'Marketing Specialist', source: Source.OcrList, consent: ConsentStatus.Unknown, createdAt: getDateAgo(0) },
  { id: '3', fullName: 'John Doe', phone: '14155552671', email: 'john.doe@techcorp.com', company: 'TechCorp Inc.', jobTitle: 'Lead Developer', source: Source.Form, consent: ConsentStatus.OptIn, createdAt: getDateAgo(5) },
  { id: '4', fullName: 'Ahmad Abdullah', phone: '6285512345678', email: 'ahmad.a@startup.id', company: 'Startup Indonesia', jobTitle: 'Founder', source: Source.OcrList, consent: ConsentStatus.Unknown, createdAt: getDateAgo(8) },
  { id: '5', fullName: 'Siti Aminah', phone: '6281311223344', email: 'siti@gov.id', company: 'Departemen Kreatif', jobTitle: 'Public Relations', source: Source.Manual, consent: ConsentStatus.OptIn, createdAt: getDateAgo(2) },
  { id: '6', fullName: 'Michael Chen', phone: '16501112222', email: 'm.chen@silicon.io', company: 'NextGen AI', jobTitle: 'CTO', source: Source.Form, consent: ConsentStatus.OptIn, createdAt: getDateAgo(3) },
  { id: '7', fullName: 'Rina Wijaya', phone: '6281999888777', email: 'rina.w@creative.net', company: 'Studio 45', jobTitle: 'Art Director', source: Source.OcrList, consent: ConsentStatus.OptOut, createdAt: getDateAgo(4) },
  { id: '8', fullName: 'David Beckham', phone: '447700111222', email: 'david@football.uk', company: 'Inter Miami', jobTitle: 'Owner', source: Source.Manual, consent: ConsentStatus.OptIn, createdAt: getDateAgo(12) },
  { id: '9', fullName: 'Eko Prasetyo', phone: '6281255554444', email: 'eko.p@bank.id', company: 'Bank Central', jobTitle: 'Account Manager', source: Source.Import, consent: ConsentStatus.Unknown, createdAt: getDateAgo(6) },
  { id: '10', fullName: 'Linda Hamilton', phone: '13105559988', email: 'linda@security.com', company: 'Sarah Corp', jobTitle: 'CEO', source: Source.Manual, consent: ConsentStatus.OptIn, createdAt: getDateAgo(15) },
  { id: '11', fullName: 'Agus Kotak', phone: '6282211223344', email: 'agus@kotak.com', company: 'Kotak Band', jobTitle: 'Vocalist', source: Source.OcrList, consent: ConsentStatus.OptIn, createdAt: getDateAgo(7) },
  { id: '12', fullName: 'Diana Prince', phone: '12025550123', email: 'diana@themyscira.com', company: 'Justice Global', jobTitle: 'Ambassador', source: Source.Form, consent: ConsentStatus.OptIn, createdAt: getDateAgo(20) },
  { id: '13', fullName: 'Tono Sudaryono', phone: '6281877665544', email: 'tono@logistic.id', company: 'Cepat Kilat', jobTitle: 'Operations Manager', source: Source.Import, consent: ConsentStatus.OptOut, createdAt: getDateAgo(2) },
  { id: '14', fullName: 'Jessica Jones', phone: '12125550199', email: 'jessica@alias.com', company: 'Alias Investigations', jobTitle: 'Private Eye', source: Source.Manual, consent: ConsentStatus.Unknown, createdAt: getDateAgo(25) },
  { id: '15', fullName: 'Hendra Setiawan', phone: '6281355556666', email: 'hendra@badminton.id', company: 'PBSI', jobTitle: 'Senior Athlete', source: Source.OcrList, consent: ConsentStatus.OptIn, createdAt: getDateAgo(1) },
];
