#!/usr/bin/env python3
"""Edit hours from DaVinci Resolve's project backups — for the Calendar tab's Edit row.

Resolve writes a backup of a project (Project.db.YYYYMMDDHHMMSS) every few minutes, but
ONLY when the project has changed since the last one. So the backup times trace the
stretches of real work: a run of backups ~5 min apart is a session, a gap is a break.

  python3 resolve-edit-hours.py "Fashion Files London"      → JSON on stdout

Matches every backup folder whose project name contains the text (case-insensitive).
A session is backups no more than GAP_MIN apart; it counts from one interval before
its first backup to its last. Minutes per day are written out; the app rounds to hours.

A folder whose backups are mostly far apart (median gap > 30 min) has been thinned
by Resolve's retention (hourly / daily copies only) — its days are marked partial:
there was work, but how much can't be told. Read-only throughout.
"""
import json, re, sqlite3, statistics, sys
from collections import defaultdict
from datetime import datetime, timedelta
from pathlib import Path

GAP_MIN = 15
PREFS = Path.home() / 'Library/Preferences/Blackmagic Design/DaVinci Resolve/config.user.xml'


def backup_root():
    m = re.search(r'<ProjectBackupLocation>(.*?)</ProjectBackupLocation>', PREFS.read_text())
    p = Path(m.group(1)) if m else None
    if p and not p.exists() and str(p).startswith('/Volumes/Macintosh HD'):
        p = Path(str(p)[len('/Volumes/Macintosh HD'):])
    return p


def project_name(db):
    try:
        con = sqlite3.connect(f'file:{db}?mode=ro&immutable=1', uri=True)
        row = con.execute('select ProjectName from SM_Project limit 1').fetchone()
        con.close()
        return row[0] if row else ''
    except sqlite3.Error:
        return ''


def main(match):
    root = backup_root()
    interval = 5
    m = re.search(r'<AutoSaveDuration>(\d+)</AutoSaveDuration>', PREFS.read_text())
    if m: interval = int(m.group(1))
    minutes, partial, names, first, last = defaultdict(int), set(), set(), None, None
    for folder in sorted(p for p in root.iterdir() if p.is_dir()):
        dbs = sorted(folder.glob('Project.db.*'))
        if not dbs: continue
        name = project_name(dbs[-1])
        if match.lower() not in name.lower(): continue
        names.add(name)
        times = sorted(datetime.strptime(d.name[-14:], '%Y%m%d%H%M%S') for d in dbs)
        gaps = [(b - a).total_seconds() / 60 for a, b in zip(times, times[1:])]
        thinned = bool(gaps) and statistics.median(gaps) > 30
        first = min(first or times[0], times[0]); last = max(last or times[-1], times[-1])
        if thinned:
            partial.update(t.date().isoformat() for t in times)
            continue
        start = prev = times[0]
        for t in times[1:] + [None]:
            if t is not None and (t - prev) <= timedelta(minutes=GAP_MIN) and t.date() == prev.date():
                prev = t; continue
            minutes[start.date().isoformat()] += round((prev - start).total_seconds() / 60) + interval
            if t is not None: start = prev = t
    days = {d: {'mins': minutes.get(d, 0), **({'partial': True} if d in partial else {})}
            for d in sorted(set(minutes) | partial)}
    json.dump({'source': 'DaVinci Resolve project backups', 'projects': sorted(names),
               'from': first and first.date().isoformat(), 'to': last and last.date().isoformat(),
               'importedAt': datetime.now().isoformat(timespec='seconds'), 'days': days},
              sys.stdout, indent=1)
    print()


if __name__ == '__main__':
    main(sys.argv[1] if len(sys.argv) > 1 else '')
