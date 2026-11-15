import { useEffect, useState } from 'react';

const FORTY_TWO_HOURS = 42 * 60 * 60 * 1000;

export function useReminderScheduler(subjects, state) {
  const [staleSubjects, setStaleSubjects] = useState([]);

  function checkStale() {
    if (!subjects || !state) {
      setStaleSubjects([]);
      return [];
    }
    const now = Date.now();
    const stale = subjects.filter((sub) => {
      const s = state[sub.code];
      if (!s?.lastUpdated) return true;
      const last = new Date(s.lastUpdated).getTime();
      return now - last > FORTY_TWO_HOURS;
    });
    setStaleSubjects(stale);
    return stale;
  }

  function getHoursSinceUpdate(subject) {
    const s = state?.[subject.code];
    if (!s?.lastUpdated) return Infinity;
    const diff = Date.now() - new Date(s.lastUpdated).getTime();
    return Math.floor(diff / (1000 * 60 * 60));
  }

  function sendReminder(subject) {
    const hours = getHoursSinceUpdate(subject);
    const recipient = 'faculty@college.edu';
    const cc = 'hetsuthar2157@gmail.com';
    const subjectLine = encodeURIComponent(`Reminder: lecture update needed — ${subject.code} ${subject.title}`);
    const body = encodeURIComponent(
      `Dear Faculty,\n\nThis is an automated reminder from NPCCSM Portal.\n\nThe subject ${subject.code} - ${subject.title} (Semester ${subject.semester || 'current'}) has not been updated for ${hours} hours.\n\nPlease publish the lecture update with covered topics and important questions as soon as possible.\n\nThank you.\nNPCCSM Syllabus Portal`,
    );
    const mailto = `mailto:${recipient}?cc=${cc}&subject=${subjectLine}&body=${body}`;
    const smsLink = `sms:?body=${encodeURIComponent(`Reminder: Please update ${subject.code} - ${subject.title} on NPCCSM Portal. Last update: ${hours}h ago.`)}`;

    return { mailto, smsLink, hours };
  }

  useEffect(() => {
    checkStale();
    const interval = setInterval(checkStale, 30 * 60 * 1000);
    return () => clearInterval(interval);
  }, [subjects, state]);

  return { staleSubjects, checkStale, getHoursSinceUpdate, sendReminder };
}
