import { supabase } from '../lib/supabase';
import { AppData, Player, Match, Admission, FinanceRecord, Notice, GalleryItem, ClubEvent, HostedTournament, ExternalTournament, CommitteeMember } from '../types';

export const supabaseService = {
  async getAllData(): Promise<AppData> {
    if (!supabase) throw new Error("Supabase client not initialized.");
    
    // Fetch data with individual error handling to prevent one table from blocking everything
    const fetchTable = async (table: string, single = false) => {
      try {
        const query = supabase.from(table).select('*');
        const { data, error } = await (single ? query.single() : query);
        if (error) {
          console.warn(`Error fetching table ${table}:`, error);
          return null;
        }
        return data;
      } catch (err) {
        console.warn(`Exception fetching table ${table}:`, err);
        return null;
      }
    };

    const [
      settings,
      committee,
      players,
      matches,
      admissions,
      finance,
      notices,
      gallery,
      events,
      hostedTournaments,
      externalTournaments
    ] = await Promise.all([
      fetchTable('settings', true),
      fetchTable('committee'),
      fetchTable('players'),
      fetchTable('matches'),
      fetchTable('admissions'),
      fetchTable('finance'),
      fetchTable('notices'),
      fetchTable('gallery'),
      fetchTable('events'),
      fetchTable('hosted_tournaments'),
      fetchTable('external_tournaments')
    ]);

    return {
      settings: {
        clubName: settings?.club_name || 'IRB Warriors',
        established: settings?.established || '2026',
        location: settings?.location || '',
        phone: settings?.phone || '',
        whatsapp: settings?.whatsapp || '',
        facebook: settings?.facebook || '',
        logo: settings?.logo || '/logo.png',
        admissionFee: settings?.admission_fee || 0,
        monthlyFee: settings?.monthly_fee || 0
      },
      committee: (committee || []) as CommitteeMember[],
      players: (players || []).map(p => ({
        ...p,
        fatherName: p.father_name,
        dob: p.dob,
        bloodGroup: p.blood_group,
        address: p.address,
        photo: p.photo,
        battingStyle: p.batting_style,
        bowlingStyle: p.bowling_style,
        jerseySize: p.jersey_size,
        jerseyNumber: p.jersey_number,
        isCaptain: p.is_captain,
        isViceCaptain: p.is_vice_captain,
        monthlyFee: p.monthly_fee,
        stats: p.stats || { matches: 0, runs: 0, wickets: 0, avg: 0, sr: 0, fours: 0, sixes: 0, fifties: 0, hundreds: 0, bowlInnings: 0, overs: 0, runsConceded: 0, bestBowling: "N/A", economy: 0, bowlSr: 0, maidens: 0 },
        tournamentStats: p.tournament_stats || [],
        lastMatches: p.last_matches || [],
        matchHistory: p.match_history || []
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
        photo: a.photo,
        battingStyle: a.batting_style,
        bowlingStyle: a.bowling_style,
        jerseySize: a.jersey_size,
        jerseyNumber: a.jersey_number,
        paymentStatus: a.payment_status,
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
        logo: settings.logo,
        admission_fee: settings.admissionFee,
        monthly_fee: settings.monthlyFee
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
        photo: admission.photo,
        role: admission.role,
        batting_style: admission.battingStyle,
        bowling_style: admission.bowlingStyle,
        jersey_size: admission.jerseySize,
        jersey_number: admission.jerseyNumber,
        status: admission.status,
        payment_status: admission.paymentStatus,
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
    
    // Explicitly mapping all fields for better reliability
    const playerData: any = {
      name: player.name,
      father_name: player.fatherName || "",
      dob: player.dob || null,
      blood_group: player.bloodGroup || "",
      address: player.address || "",
      role: player.role || "Batsman",
      batting_style: player.battingStyle || "Right Hand",
      bowling_style: player.bowlingStyle || "",
      jersey_size: player.jerseySize || "M",
      jersey_number: player.jerseyNumber || "TBD",
      photo: player.photo || "https://picsum.photos/seed/new/200/200",
      phone: player.phone || "",
      status: player.status || "Active",
      is_captain: player.isCaptain ?? false,
      is_vice_captain: player.isViceCaptain ?? false,
      monthly_fee: player.monthlyFee ?? 0,
      stats: player.stats || {},
      tournament_stats: player.tournamentStats || [],
      last_matches: (player as any).lastMatches || [],
      match_history: player.matchHistory || []
    };

    const { data, error } = await supabase
      .from('players')
      .insert([playerData])
      .select()
      .single();
      
    if (error) {
      console.warn("Supabase addPlayer error:", error);
      throw error;
    }
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

  async updateMatch(id: number, updates: Partial<Match>) {
    if (!supabase) throw new Error("Supabase client not initialized.");
    const { data, error } = await supabase
      .from('matches')
      .update({
        team_a: updates.teamA,
        team_b: updates.teamB,
        date: updates.date,
        time: updates.time,
        venue: updates.venue,
        type: updates.type,
        overs: updates.overs,
        status: updates.status,
        score: updates.score,
        result: updates.result,
        playing_xi: updates.playingXI,
        performances: (updates as any).performances,
        man_of_the_match: (updates as any).manOfTheMatch
      })
      .eq('id', id);
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
        caption: item.caption,
        thumbnail: item.thumbnail
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
    
    // Map camelCase to snake_case only for defined fields
    const dbUpdates: any = {};
    if (updates.name !== undefined) dbUpdates.name = updates.name;
    if (updates.fatherName !== undefined) dbUpdates.father_name = updates.fatherName;
    if (updates.dob !== undefined) dbUpdates.dob = updates.dob;
    if (updates.bloodGroup !== undefined) dbUpdates.blood_group = updates.bloodGroup;
    if (updates.address !== undefined) dbUpdates.address = updates.address;
    if (updates.role !== undefined) dbUpdates.role = updates.role;
    if (updates.battingStyle !== undefined) dbUpdates.batting_style = updates.battingStyle;
    if (updates.bowlingStyle !== undefined) dbUpdates.bowling_style = updates.bowlingStyle;
    if (updates.jerseySize !== undefined) dbUpdates.jersey_size = updates.jerseySize;
    if (updates.jerseyNumber !== undefined) dbUpdates.jersey_number = updates.jerseyNumber;
    if (updates.photo !== undefined) dbUpdates.photo = updates.photo;
    if (updates.phone !== undefined) dbUpdates.phone = updates.phone;
    if (updates.status !== undefined) dbUpdates.status = updates.status;
    if (updates.isCaptain !== undefined) dbUpdates.is_captain = updates.isCaptain;
    if (updates.isViceCaptain !== undefined) dbUpdates.is_vice_captain = updates.isViceCaptain;
    if (updates.monthlyFee !== undefined) dbUpdates.monthly_fee = updates.monthlyFee;
    if (updates.stats !== undefined) dbUpdates.stats = updates.stats;
    if (updates.tournamentStats !== undefined) dbUpdates.tournament_stats = updates.tournamentStats;
    if (updates.lastMatches !== undefined) dbUpdates.last_matches = updates.lastMatches;
    if (updates.matchHistory !== undefined) dbUpdates.match_history = updates.matchHistory;

    const { data, error } = await supabase
      .from('players')
      .update(dbUpdates)
      .eq('id', id);
    if (error) throw error;
    return data;
  },

  async updateAdmission(id: number, updates: Partial<Admission>) {
    if (!supabase) throw new Error("Supabase client not initialized.");
    
    // Map camelCase to snake_case only for defined fields
    const dbUpdates: any = {};
    if (updates.name !== undefined) dbUpdates.name = updates.name;
    if (updates.fatherName !== undefined) dbUpdates.father_name = updates.fatherName;
    if (updates.dob !== undefined) dbUpdates.dob = updates.dob;
    if (updates.bloodGroup !== undefined) dbUpdates.blood_group = updates.bloodGroup;
    if (updates.phone !== undefined) dbUpdates.phone = updates.phone;
    if (updates.address !== undefined) dbUpdates.address = updates.address;
    if (updates.photo !== undefined) dbUpdates.photo = updates.photo;
    if (updates.role !== undefined) dbUpdates.role = updates.role;
    if (updates.battingStyle !== undefined) dbUpdates.batting_style = updates.battingStyle;
    if (updates.bowlingStyle !== undefined) dbUpdates.bowling_style = updates.bowlingStyle;
    if (updates.jerseySize !== undefined) dbUpdates.jersey_size = updates.jerseySize;
    if (updates.jerseyNumber !== undefined) dbUpdates.jersey_number = updates.jerseyNumber;
    if (updates.status !== undefined) dbUpdates.status = updates.status;
    if (updates.paymentStatus !== undefined) dbUpdates.payment_status = updates.paymentStatus;
    if (updates.registrationDate !== undefined) dbUpdates.registration_date = updates.registrationDate;

    const { data, error } = await supabase
      .from('admissions')
      .update(dbUpdates)
      .eq('id', id);
    if (error) throw error;
    return data;
  },

  async getProfile(id: string) {
    if (!supabase) throw new Error("Supabase client not initialized.");
    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', id)
      .single();
    if (error) return null;
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
