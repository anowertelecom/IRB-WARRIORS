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
      .upsert({
        id: 1,
        club_name: settings.clubName,
        established: settings.established,
        location: settings.location,
        phone: settings.phone,
        whatsapp: settings.whatsapp,
        facebook: settings.facebook,
        logo: settings.logo
      });
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
  },

  async addPlayer(player: Omit<Player, 'id'>) {
    if (!supabase) throw new Error("Supabase client not initialized.");
    const { data, error } = await supabase
      .from('players')
      .insert([{
        name: player.name,
        role: player.role,
        jersey_number: player.jerseyNumber,
        photo: player.photo,
        phone: player.phone,
        status: player.status,
        stats: player.stats
      }])
      .select()
      .single();
    if (error) throw error;
    return data;
  },

  async addCommitteeMember(member: Omit<CommitteeMember, 'id'>) {
    if (!supabase) throw new Error("Supabase client not initialized.");
    const { data, error } = await supabase
      .from('committee')
      .insert([{
        name: member.name,
        role: member.role,
        photo: member.photo,
        phone: member.phone
      }])
      .select()
      .single();
    if (error) throw error;
    return data;
  },

  async addMatch(match: Omit<Match, 'id'>) {
    if (!supabase) throw new Error("Supabase client not initialized.");
    const { data, error } = await supabase
      .from('matches')
      .insert([{
        team_a: match.teamA,
        team_b: match.teamB,
        date: match.date,
        time: match.time,
        venue: match.venue,
        type: match.type,
        overs: match.overs,
        status: match.status,
        score: match.score,
        result: match.result,
        playing_xi: match.playingXI
      }])
      .select()
      .single();
    if (error) throw error;
    return data;
  },

  async addFinance(record: Omit<FinanceRecord, 'id'>) {
    if (!supabase) throw new Error("Supabase client not initialized.");
    const { data, error } = await supabase
      .from('finance')
      .insert([{
        type: record.type,
        amount: record.amount,
        category: record.category,
        description: record.description,
        date: record.date,
        member_id: record.memberId
      }])
      .select()
      .single();
    if (error) throw error;
    return data;
  },

  async addNotice(notice: Omit<Notice, 'id'>) {
    if (!supabase) throw new Error("Supabase client not initialized.");
    const { data, error } = await supabase
      .from('notices')
      .insert([{
        title: notice.title,
        content: notice.content,
        date: notice.date,
        priority: notice.priority
      }])
      .select()
      .single();
    if (error) throw error;
    return data;
  },

  async addGalleryItem(item: Omit<GalleryItem, 'id'>) {
    if (!supabase) throw new Error("Supabase client not initialized.");
    const { data, error } = await supabase
      .from('gallery')
      .insert([{
        type: item.type,
        url: item.url,
        caption: item.caption
      }])
      .select()
      .single();
    if (error) throw error;
    return data;
  },

  async addEvent(event: Omit<ClubEvent, 'id'>) {
    if (!supabase) throw new Error("Supabase client not initialized.");
    const { data, error } = await supabase
      .from('events')
      .insert([{
        title: event.title,
        description: event.description,
        date: event.date,
        location: event.location
      }])
      .select()
      .single();
    if (error) throw error;
    return data;
  },

  async addHostedTournament(tournament: Omit<HostedTournament, 'id'>) {
    if (!supabase) throw new Error("Supabase client not initialized.");
    const { data, error } = await supabase
      .from('hosted_tournaments')
      .insert([{
        name: tournament.name,
        date: tournament.startDate,
        venue: "IRB Ground", // Default venue since it's not in type
        entry_fee: tournament.entryFee,
        prize_pool: tournament.prizePool,
        max_teams: tournament.maxTeams,
        status: tournament.status,
        type: tournament.type,
        is_published: tournament.isPublished,
        registrations: tournament.registrations,
        sponsors: tournament.sponsors,
        fixtures: tournament.fixtures
      }])
      .select()
      .single();
    if (error) throw error;
    return data;
  },

  async updateHostedTournament(id: number, updates: Partial<HostedTournament>) {
    if (!supabase) throw new Error("Supabase client not initialized.");
    const { data, error } = await supabase
      .from('hosted_tournaments')
      .update({
        name: updates.name,
        date: updates.startDate,
        entry_fee: updates.entryFee,
        prize_pool: updates.prizePool,
        max_teams: updates.maxTeams,
        status: updates.status,
        type: updates.type,
        is_published: updates.isPublished,
        registrations: updates.registrations,
        sponsors: updates.sponsors,
        fixtures: updates.fixtures
      })
      .eq('id', id);
    if (error) throw error;
    return data;
  },

  async updateCommitteeMember(id: number, updates: Partial<CommitteeMember>) {
    if (!supabase) throw new Error("Supabase client not initialized.");
    const { data, error } = await supabase
      .from('committee')
      .update({
        name: updates.name,
        role: updates.role,
        phone: updates.phone,
        photo: updates.photo
      })
      .eq('id', id);
    if (error) throw error;
    return data;
  },

  async updatePlayer(id: number, updates: Partial<Player>) {
    if (!supabase) throw new Error("Supabase client not initialized.");
    const { data, error } = await supabase
      .from('players')
      .update({
        name: updates.name,
        role: updates.role,
        jersey_number: updates.jerseyNumber,
        photo: updates.photo,
        phone: updates.phone,
        status: updates.status,
        stats: updates.stats
      })
      .eq('id', id);
    if (error) throw error;
    return data;
  },

  subscribeToData(onUpdate: () => void) {
    if (!supabase) return null;
    return supabase
      .channel('any')
      .on('postgres_changes', { event: '*', schema: 'public' }, () => {
        onUpdate();
      })
      .subscribe();
  }
};
