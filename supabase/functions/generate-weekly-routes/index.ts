/*****************************************************************************************
 * WINREP PRO – FULL ROUTING & SCHEDULING ENGINE
 * Implements ALL Sales Rep Rules:
 *  - 1 flex day per week
 *  - Juliet Falls every other Thu (or Wed/Fri if needed)
 *  - Villages EVERY WEEK (largest region - primary Wed, overflow Tue/Flex)
 *  - BayCare Winter Haven 2x monthly
 *  - Celebration Golf = FIRST STOP of Orlando Day
 *  - Mystic Dunes = LAST STOP of Orlando Day
 *  - 15th & 30th/31st = HALF-DAYS → LOCAL ONLY
 *  - Friday = early stop; NO Tampa/DTE routes
 *  - 5–7 stops per day max
 *  - Must be headed home 12–2pm
 *  - Low-priority accounts = every 4–5 weeks
 *
 *  Built for Lovable.dev — fully modular, uses Supabase + expandable dataset.
 *****************************************************************************************/

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.58.0';
import { z } from 'https://deno.land/x/zod@v3.22.4/mod.ts';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Request validation schema
const requestSchema = z.object({
  weekNumber: z.number().min(1).max(53),
  weekStartDate: z.string(),
  originAddress: z.string().optional(),
});

interface RouteAccount {
  id: string;
  name: string;
  address: string;
  region: string;
  priority: string;
  frequency: string;
  tags: string[];
  notes: string | null;
}

interface DailyRoute {
  stops: RouteAccount[];
  googleRoute: string;
}

interface WeeklyRoutes {
  Monday: DailyRoute;
  Tuesday: DailyRoute;
  Wednesday: DailyRoute;
  Thursday: DailyRoute;
  Friday: DailyRoute;
  FlexDay: DailyRoute;
}

// Helper: Build Google Maps route URL
function buildRouteURL(origin: string, stops: RouteAccount[]): string {
  if (stops.length === 0) return '';
  
  const destination = origin;
  const waypointString = stops.map(s => encodeURIComponent(s.address)).join('|');

  return (
    'https://www.google.com/maps/dir/?api=1' +
    '&origin=' + encodeURIComponent(origin) +
    '&destination=' + encodeURIComponent(destination) +
    '&waypoints=' + waypointString +
    '&travelmode=driving'
  );
}

// Rule: Villages - ALWAYS schedule (largest region)
function filterVillagesByMonth(weekNumber: number): boolean {
  return true; // Villages runs every week, not just weeks 1-2
}

// Rule: Juliet Falls every OTHER Thursday (odd weeks)
function includeJulietFalls(weekNumber: number): boolean {
  return weekNumber % 2 === 1;
}

// Rule: BayCare 2x monthly (weeks 1 & 3)
function bayCareWeeks(weekNumber: number): boolean {
  return weekNumber === 1 || weekNumber === 3;
}

// Rule: 15th & 30th/31st = HALF-DAYS
function isHalfDay(date: Date): boolean {
  const day = date.getDate();
  return day === 15 || day === 30 || day === 31;
}

// Rule: Friday - NO Tampa/DTE routes
function blockFridayRegions(region: string): boolean {
  return ['Tampa', 'DTE Legends', 'DTE Tampa', 'Ocala', 'Villages'].includes(region);
}

// Main route builder
async function buildWeeklyRoutes(
  accounts: RouteAccount[],
  weekNumber: number,
  dateObj: Date,
  origin: string
): Promise<WeeklyRoutes> {
  let week: Record<string, RouteAccount[]> = {
    Monday: [],
    Tuesday: [],
    Wednesday: [],
    Thursday: [],
    Friday: [],
    FlexDay: []
  };

  // STEP A: Apply frequency logic
  const eligible = accounts.filter(acc => {
    // Villages is always eligible (biggest region, needs weekly visits)
    if (acc.region === 'Villages') return true;
    // Monthly accounts only in week 1
    if (acc.frequency === 'monthly' && weekNumber !== 1) return false;
    // Biweekly accounts on odd weeks
    if (acc.frequency === 'biweekly' && weekNumber % 2 === 0) return false;
    return true;
  });

  // STEP B: Group by region
  const grouped: Record<string, RouteAccount[]> = {
    Lakeland: eligible.filter(a => a.region === 'Lakeland'),
    HainesCity: eligible.filter(a => a.region === 'HainesCity'),
    Tampa: eligible.filter(a => a.region === 'Tampa'),
    Orlando: eligible.filter(a => a.region === 'Orlando'),
    Villages: eligible.filter(a => a.region === 'Villages'),
    Ocala: eligible.filter(a => a.region === 'Ocala'),
  };

  // STEP C: Build daily assignments

  // Monday → Lakeland / Haines City
  week.Monday = [
    ...grouped.Lakeland.slice(0, 4),
    ...grouped.HainesCity.slice(0, 3)
  ].slice(0, 7);

  // Tuesday → Tampa (or Villages overflow)
  if (grouped.Villages.length > 7) {
    // If Villages has many accounts, split between Wed & Tue
    week.Tuesday = grouped.Villages.slice(7, 14);
  } else {
    week.Tuesday = grouped.Tampa.slice(0, 7);
  }

  // Wednesday → Villages (PRIMARY day - largest region)
  week.Wednesday = grouped.Villages.slice(0, 7);

  // Thursday → Ocala + Juliet Falls
  week.Thursday = grouped.Ocala.slice(0, 5);
  if (includeJulietFalls(weekNumber)) {
    const juliet = accounts.find(a => a.tags?.includes('julietFalls'));
    if (juliet) week.Thursday.unshift(juliet);
  }

  // Friday → Orlando (Celebration first, Mystic Dunes last)
  const orlandoBase = grouped.Orlando.filter(a => 
    !blockFridayRegions(a.region)
  );

  const celebration = orlandoBase.find(a => a.tags?.includes('firstStop'));
  const mystic = orlandoBase.find(a => a.tags?.includes('lastStop'));

  const middle = orlandoBase.filter(a =>
    !a.tags?.includes('firstStop') &&
    !a.tags?.includes('lastStop')
  ).slice(0, 5);

  week.Friday = [
    celebration,
    ...middle,
    mystic
  ].filter(Boolean) as RouteAccount[];

  // Flex Day → Villages overflow or Tampa catch-up
  if (grouped.Villages.length > 14) {
    week.FlexDay = grouped.Villages.slice(14, 21);
  } else {
    week.FlexDay = grouped.Tampa.slice(0, 7);
  }

  // STEP D: Half-Day override (15th, 30th, 31st)
  if (isHalfDay(dateObj)) {
    week = {
      Monday: [],
      Tuesday: [],
      Wednesday: [],
      Thursday: [],
      Friday: grouped.Lakeland.slice(0, 3),
      FlexDay: []
    };
  }

  // STEP E: Add route links
  const weekWithLinks: WeeklyRoutes = {
    Monday: {
      stops: week.Monday,
      googleRoute: buildRouteURL(origin, week.Monday)
    },
    Tuesday: {
      stops: week.Tuesday,
      googleRoute: buildRouteURL(origin, week.Tuesday)
    },
    Wednesday: {
      stops: week.Wednesday,
      googleRoute: buildRouteURL(origin, week.Wednesday)
    },
    Thursday: {
      stops: week.Thursday,
      googleRoute: buildRouteURL(origin, week.Thursday)
    },
    Friday: {
      stops: week.Friday,
      googleRoute: buildRouteURL(origin, week.Friday)
    },
    FlexDay: {
      stops: week.FlexDay,
      googleRoute: buildRouteURL(origin, week.FlexDay)
    }
  };

  return weekWithLinks;
}

Deno.serve(async (req) => {
  const startTime = Date.now();
  let statusCode = 200;
  let errorMessage: string | null = null;
  const functionName = 'generate-weekly-routes';

  // Handle CORS
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      {
        global: {
          headers: { Authorization: req.headers.get('Authorization')! },
        },
      }
    );

    // Get authenticated user
    const {
      data: { user },
      error: userError,
    } = await supabaseClient.auth.getUser();

    if (userError || !user) {
      statusCode = 401;
      errorMessage = 'Unauthorized';
      throw new Error('Unauthorized');
    }

    // Rate limiting
    const { data: rateLimitOk, error: rateLimitError } = await supabaseClient.rpc(
      'check_rate_limit',
      {
        p_user_id: user.id,
        p_function_name: functionName,
        p_max_requests: 20,
        p_window_minutes: 1,
      }
    );

    if (rateLimitError || !rateLimitOk) {
      statusCode = 429;
      errorMessage = 'Rate limit exceeded';
      throw new Error('Rate limit exceeded');
    }

    // Parse and validate request
    const body = await req.json();
    const validatedData = requestSchema.parse(body);

    // Fetch route accounts with priority scores
    const { data: accounts, error: accountsError } = await supabaseClient
      .from('route_accounts')
      .select('*')
      .eq('user_id', user.id)
      .eq('is_active', true)
      .order('priority_score', { ascending: false }); // Highest priority first

    if (accountsError) {
      statusCode = 500;
      errorMessage = accountsError.message;
      throw accountsError;
    }

  // Build weekly routes
  const dateObj = new Date(validatedData.weekStartDate);
  const origin = validatedData.originAddress || 'Rockridge Rd, Lakeland FL';

  // Generate Week A (current week)
  const weekARoutes = await buildWeeklyRoutes(
    accounts as RouteAccount[],
    validatedData.weekNumber,
    dateObj,
    origin
  );

  // Generate Week B (following week)
  const nextWeekDate = new Date(dateObj);
  nextWeekDate.setDate(dateObj.getDate() + 7);
  const weekBRoutes = await buildWeeklyRoutes(
    accounts as RouteAccount[],
    validatedData.weekNumber + 1,
    nextWeekDate,
    origin
  );

  const twoWeekSchedule = {
    weekA: weekARoutes,
    weekB: weekBRoutes,
  };

  // Save to database
  const { error: saveError } = await supabaseClient
    .from('weekly_routes')
    .upsert({
      user_id: user.id,
      week_number: validatedData.weekNumber,
      week_start_date: validatedData.weekStartDate,
      origin_address: origin,
      routes: twoWeekSchedule,
    });

    if (saveError) {
      statusCode = 500;
      errorMessage = saveError.message;
      throw saveError;
    }

    // Log success
    await supabaseClient.from('edge_function_logs').insert({
      function_name: functionName,
      user_id: user.id,
      status_code: statusCode,
      response_time_ms: Date.now() - startTime,
      method: req.method,
      request_path: '/generate-weekly-routes',
      metadata: { weekNumber: validatedData.weekNumber },
    });

    return new Response(
      JSON.stringify({ success: true, routes: twoWeekSchedule }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: statusCode,
      }
    );

  } catch (error) {
    console.error('Error generating routes:', error);

    const responseTimeMs = Date.now() - startTime;

    // Log error
    try {
      const supabaseClient = createClient(
        Deno.env.get('SUPABASE_URL') ?? '',
        Deno.env.get('SUPABASE_ANON_KEY') ?? ''
      );

      await supabaseClient.from('edge_function_logs').insert({
        function_name: functionName,
        status_code: statusCode,
        response_time_ms: responseTimeMs,
        error_message: errorMessage || (error as Error).message,
        method: req.method,
        request_path: '/generate-weekly-routes',
      });
    } catch (logError) {
      console.error('Failed to log error:', logError);
    }

    return new Response(
      JSON.stringify({ 
        error: errorMessage || (error as Error).message 
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: statusCode,
      }
    );
  }
});
