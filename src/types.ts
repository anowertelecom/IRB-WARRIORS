export interface CommitteeMember {
  id: number;
  name: string;
  role: string;
  photo: string;
  phone: string;
}

export interface Player {
  id: number;
  name: string;
  role: 'Batsman' | 'Bowler' | 'All-rounder' | 'Wicket Keeper';
  jerseyNumber: string;
  photo: string;
  phone: string;
  status: 'Active' | 'Injured' | 'Inactive';
  stats: {
    matches: number;
    runs: number;
    wickets: number;
    avg: number;
    sr: number;
  };
}

export interface Match {
  id: number;
  teamA: string;
  teamB: string;
  date: string;
  time: string;
  venue: string;
  type: 'Short Pitch' | 'Long Pitch';
  overs: number;
  status: 'Upcoming' | 'Live' | 'Finished';
  result?: string;
  score?: {
    teamARuns: number;
    teamAWickets: number;
    teamAOvers: string;
    teamBRuns: number;
    teamBWickets: number;
    teamBOvers: string;
  };
  playingXI?: number[]; // Array of player IDs
}

export interface FinanceRecord {
  id: number;
  type: 'Income' | 'Expense';
  amount: number;
  category: string;
  description: string;
  date: string;
  memberId?: number; // Optional link to a member/player
}

export interface Notice {
  id: number;
  title: string;
  content: string;
  date: string;
  priority: 'Normal' | 'Urgent';
}

export interface Admission {
  id: number;
  name: string;
  fatherName?: string;
  dob?: string;
  bloodGroup?: string;
  phone: string;
  address?: string;
  role: 'Batsman' | 'Bowler' | 'All-rounder' | 'Wicket Keeper';
  battingStyle?: 'Right Hand' | 'Left Hand';
  bowlingStyle?: string;
  jerseySize?: 'S' | 'M' | 'L' | 'XL' | 'XXL';
  jerseyNumber?: string;
  status: 'pending' | 'approved' | 'rejected';
  registrationDate?: string;
}

export interface GalleryItem {
  id: number;
  type: 'Photo' | 'Video';
  url: string;
  thumbnail?: string;
  caption: string;
}

export interface ClubEvent {
  id: number;
  title: string;
  date: string;
  location: string;
  description: string;
}

export interface TournamentRegistration {
  id: number;
  tournamentId: number;
  teamName: string;
  address: string;
  phone: string;
  captainName?: string;
  logo?: string;
  totalFee: number;
  amountPaid: number;
  amountDue: number;
  paymentStatus: 'Unpaid' | 'Partial' | 'Paid';
  email?: string;
  playersCount: number;
  playerIds?: number[];
  transactionId?: string;
  registrationDate: string;
}

export interface TournamentSponsor {
  id: number;
  name: string;
  logo: string;
  tier: 'Platinum' | 'Gold' | 'Silver';
}

export interface HostedTournament {
  id: number;
  name: string;
  startDate: string;
  endDate: string;
  entryFee: number;
  prizePool: string;
  maxTeams: number;
  status: 'Upcoming' | 'Ongoing' | 'Finished';
  type: 'Public' | 'Domestic';
  isPublished: boolean;
  rules: string;
  registrations: TournamentRegistration[];
  sponsors: TournamentSponsor[];
  fixtures: Match[];
}

export interface ExternalTournament {
  id: number;
  name: string;
  organizer: string;
  location: string;
  startDate: string;
  budget: number;
  expenses: FinanceRecord[];
  squad: number[]; // Player IDs
  matches: Match[];
  currentStage: string; // e.g., 'Group Stage', 'Quarter Final', etc.
  status: 'Upcoming' | 'Participating' | 'Finished';
  result?: string;
}

export interface AppData {
  settings: {
    clubName: string;
    established: string;
    location: string;
    phone: string;
    whatsapp: string;
    facebook: string;
    logo: string;
  };
  committee: CommitteeMember[];
  players: Player[];
  matches: Match[];
  admissions: Admission[];
  finance: FinanceRecord[];
  notices: Notice[];
  gallery: GalleryItem[];
  events: ClubEvent[];
  hostedTournaments: HostedTournament[];
  externalTournaments: ExternalTournament[];
}
