// ICS Calendar file generator for route schedules

interface RouteStop {
  name: string;
  address: string;
}

interface DailyRoute {
  stops: RouteStop[];
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

const DAYS_OF_WEEK = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'];

function formatDateTime(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  const hours = String(date.getHours()).padStart(2, '0');
  const minutes = String(date.getMinutes()).padStart(2, '0');
  const seconds = String(date.getSeconds()).padStart(2, '0');
  return `${year}${month}${day}T${hours}${minutes}${seconds}`;
}

function escapeICSText(text: string): string {
  return text
    .replace(/\\/g, '\\\\')
    .replace(/;/g, '\\;')
    .replace(/,/g, '\\,')
    .replace(/\n/g, '\\n');
}

export function generateICS(
  weekARoutes: WeeklyRoutes,
  weekBRoutes: WeeklyRoutes,
  startDate: Date,
  originAddress: string
): string {
  const lines: string[] = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//WinRep Pro//Route Scheduler//EN',
    'CALSCALE:GREGORIAN',
    'METHOD:PUBLISH',
    'X-WR-CALNAME:WinRep Pro Routes',
    'X-WR-TIMEZONE:America/New_York',
  ];

  const weeks = [
    { label: 'Week A', routes: weekARoutes, weekOffset: 0 },
    { label: 'Week B', routes: weekBRoutes, weekOffset: 1 },
  ];

  weeks.forEach(({ label, routes, weekOffset }) => {
    DAYS_OF_WEEK.forEach((day, dayIndex) => {
      const route = routes[day as keyof WeeklyRoutes];
      
      // Calculate the date for this event
      const eventDate = new Date(startDate);
      eventDate.setDate(startDate.getDate() + (weekOffset * 7) + dayIndex);
      
      // Skip if it's the flex day with no stops
      if (day === 'FlexDay' && (!route.stops || route.stops.length === 0)) {
        return;
      }

      const startTime = new Date(eventDate);
      startTime.setHours(9, 0, 0, 0);
      
      const endTime = new Date(eventDate);
      endTime.setHours(15, 0, 0, 0);

      const stopNames = route.stops.map(s => s.name).join(', ');
      const stopCount = route.stops.length;

      let summary: string;
      let description: string;
      let location: string;

      if (stopCount === 0) {
        summary = `${label} - ${day}: Home/Admin Day`;
        description = 'Flex day for paperwork, receipts, and planning.';
        location = originAddress;
      } else {
        summary = `${label} - ${day}: ${stopCount} Stops`;
        
        const stopList = route.stops
          .map((s, i) => `${i + 1}. ${s.name} - ${s.address}`)
          .join('\\n');
        
        description = [
          `${stopCount} stops scheduled`,
          '',
          'Stops:',
          stopList,
          '',
          `Route: ${route.googleRoute}`,
        ].join('\\n');
        
        location = route.stops[0]?.address || originAddress;
      }

      const uid = `${label.replace(' ', '')}-${day}-${formatDateTime(startTime)}@winrep-pro`;
      const now = formatDateTime(new Date());

      lines.push(
        'BEGIN:VEVENT',
        `UID:${uid}`,
        `DTSTAMP:${now}`,
        `DTSTART:${formatDateTime(startTime)}`,
        `DTEND:${formatDateTime(endTime)}`,
        `SUMMARY:${escapeICSText(summary)}`,
        `DESCRIPTION:${escapeICSText(description)}`,
        `LOCATION:${escapeICSText(location)}`,
        'STATUS:CONFIRMED',
        'SEQUENCE:0',
        'END:VEVENT'
      );
    });
  });

  lines.push('END:VCALENDAR');
  
  return lines.join('\r\n');
}

export function downloadICS(content: string, filename: string = 'winrep-routes.ics') {
  const blob = new Blob([content], { type: 'text/calendar;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}
