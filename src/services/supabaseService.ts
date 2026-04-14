import { supabase } from '../lib/supabase';
import { AppData, Player, Match, Admission, FinanceRecord, Notice, GalleryItem, ClubEvent, HostedTournament, ExternalTournament, CommitteeMember } from '../types';

export const supabaseService = {
  async getAllData(): Promise<AppData> {
    if (!supabase) throw new Error("Supabase client not initialized. Check your environment variables.");
    const [
      { data: settings },
      { data: committee },
      { data: players },
      { data: matches },
      { data: admissions },
      { data: finance },
      { data: notices },
      { data: gallery },
      { data: events },
      { data: hostedTournaments },
      { data: externalTournaments }
    ] = await Promise.all([
      supabase.from('settings').select('*').single(),
      supabase.from('committee').select('*'),
      supabase.from('players').select('*'),
      supabase.from('matches').select('*'),
      supabase.from('admissions').select('*'),
      supabase.from('finance').select('*'),
      supabase.from('notices').select('*'),
      supabase.from('gallery').select('*'),
      supabase.from('events').select('*'),
      supabase.from('hosted_tournaments').select('*'),
      supabase.from('external_tournaments').select('*')
    ]);

    return {
      settings: {
        clubName: settings?.club_name || 'IRB Warriors',
        established: settings?.established || '2026',
        location: settings?.location || '',
        phone: settings?.phone || '',
        whatsapp: settings?.whatsapp || '',
        facebook: settings?.facebook || '',
        logo: settings?.logo || '/logo.png'
      },
      committee: (committee || []) as CommitteeMember[],
      players: (players || []).map(p => ({
        ...p,
        jerseyNumber: p.jersey_number,
        stats: p.stats || { matches: 0, runs: 0, wickets: 0, avg: 0, sr: 0 }
      })) as Player[],
      matches: (matches || []).map(m => ({
        ...m,
        teamA: m.team_a,
        teamB: m.team_b,
        playingXI: m.playing_xi
      })) as Match[],
      admissions: (admissions || []).map(a => ({
        ...a,
        fatherName: a.father_name,
        bloodGroup: a.blood_group,
        battingStyle: a.batting_style,
        bowlingStyle: a.bowling_style,
        jerseySize: a.jersey_size,
        jerseyNumber: a.jersey_number,
        registrationDate: a.registration_date
      })) as Admission[],
      finance: (finance || []).map(f => ({
        ...f,
        memberId: f.member_id
      })) as FinanceRecord[],
      notices: (notices || []) as Notice[],
      gallery: (gallery || []) as GalleryItem[],
      events: (events || []) as ClubEvent[],
      hostedTournaments: (hostedTournaments || []) as HostedTournament[],
      externalTournaments: (externalTournaments || []) as ExternalTournament[]
    };
  },

  async updateSettings(settings: Partial<AppData['settings']>) {
    if (!supabase) throw new Error("Supabase client not initialized.");
    const { data, error } = await supabase
      .from('settings')
      .update({
        club_name: settings.clubName,
        established: settings.established,
        location: settings.location,
        phone: settings.phone,
        whatsapp: settings.whatsapp,
        facebook: settings.facebook,
        logo: settings.logo
      })
      .eq('id', 1);
    if (error) throw error;
    return data;
  },

  async addAdmission(admission: Omit<Admission, 'id'>) {
    if (!supabase) throw new Error("Supabase client not initialized.");
    const { data, error } = await supabase
      .from('admissions')
      .insert([{
        name: admission.name,
        father_name: admission.fatherName,
        dob: admission.dob,
        blood_group: admission.bloodGroup,
        phone: admission.phone,
        address: admission.address,
        role: admission.role,
        batting_style: admission.battingStyle,
        bowling_style: admission.bowlingStyle,
        jersey_size: admission.jerseySize,
        jersey_number: admission.jerseyNumber,
        status: admission.status,
        registration_date: admission.registrationDate
      }])
      .select()
      .single();
    if (error) throw error;
    return data;
  },

  async deleteRecord(table: string, id: number) {
    if (!supabase) throw new Error("Supabase client not initialized.");
    const { error } = await supabase
      .from(table)
      .delete()
      .eq('id', id);
    if (error) throw error;
  }
};
