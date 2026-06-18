# SCHEMA.md — SQLite Database Schema
# Owned by: database-architect. Do not modify from other agents.

Database file: `calendar.db` (expo-sqlite/legacy, openDatabase)
ORM/access: Raw SQL via transactionAsync / executeSqlAsync, serialized through runExclusive gate.

---

## Table: preferences

Simple key/value store for user settings. No migration history — created alongside events on first launch.

| Column | Type        | Constraints  | Notes                    |
|--------|-------------|--------------|--------------------------|
| key    | TEXT        | PRIMARY KEY  | Setting name             |
| value  | TEXT        |              | Serialized setting value |

---

## Table: events

Stores all user-created calendar entries (birthdays, yahrzeits, one-off notes, recurring events).
Schema is Google Calendar API-compatible (EventSchema.ts). Do not alter the shape of this table
without architect approval.

### Migration history

| Version | What changed                                                                   |
|---------|--------------------------------------------------------------------------------|
| v1      | Initial schema (21 columns, CREATE TABLE)                                      |
| v2      | ADD COLUMN reminder_minutes INTEGER                                             |
| v3      | ADD COLUMN color_id TEXT (also added to CREATE TABLE for new installs)         |
| v4      | ADD COLUMN location TEXT                                                       |
| v5      | ADD COLUMN recurrence_calendar, recurrence_id, is_exception, exception_date,   |
|         | renewal_ask_suppressed, last_renewal_ask; remap legacy recurrence_type values  |
| v6      | Backfill end_date = start_date where null; add index idx_events_daterange      |
|         | (start_date, end_date) for range-overlap queries                               |

### Column definitions (physical order)

| # | Column                    | Type     | Default       | Notes                                                                                     |
|---|---------------------------|----------|---------------|-------------------------------------------------------------------------------------------|
| 1 | id                        | TEXT     | PRIMARY KEY   | UUID; Google Calendar event ID format                                                     |
| 2 | summary                   | TEXT     | NOT NULL      | Event title                                                                               |
| 3 | description               | TEXT     |               | Free-text body / notes                                                                    |
| 4 | start_date                | TEXT     | NOT NULL      | ISO 8601 date YYYY-MM-DD (all-day events)                                                 |
| 5 | start_datetime            | TEXT     |               | ISO 8601 datetime (timed events); null for all-day                                        |
| 6 | end_date                  | TEXT     |               | ISO 8601 date. Guaranteed non-null for all rows as of v6 (backfilled to start_date).      |
| 7 | end_datetime              | TEXT     |               | ISO 8601 datetime; null for all-day                                                       |
| 8 | status                    | TEXT     | 'confirmed'   | confirmed / cancelled (soft-delete)                                                       |
| 9 | recurrence                | TEXT     |               | JSON-serialized string[] (RRULE array, Google Calendar format)                            |
|10 | calendar_type             | TEXT     | 'hebrew'      | 'hebrew' or 'gregorian' — which calendar this event was entered in                        |
|11 | hebrew_day                | INTEGER  |               | Hebrew day of month (1-30)                                                                |
|12 | hebrew_month              | INTEGER  |               | Hebrew month number (1-13)                                                                |
|13 | hebrew_year               | INTEGER  |               | Hebrew year                                                                               |
|14 | hebrew_month_name         | TEXT     |               | Hebrew month name string                                                                  |
|15 | recurrence_type           | TEXT     | 'none'        | Enum: none / weekly / monthly / yearly. (Legacy: yearly_hebrew etc. remapped at v5.)      |
|16 | category                  | TEXT     | 'personal'    | Event category token (personal, holiday, yahrzeit, birthday, ...)                        |
|17 | after_sunset              | INTEGER  | 0             | 1 = event starts after sunset (affects Hebrew date calculation)                           |
|18 | color_id                  | TEXT     |               | Color token key from DESIGN.md tag colors (e.g. 'tagHoliday'). Added in CREATE TABLE v3. |
|19 | created                   | TEXT     |               | ISO 8601 datetime; creation timestamp                                                     |
|20 | updated                   | TEXT     |               | ISO 8601 datetime; last-modified timestamp                                                |
|21 | notification_scheduled    | INTEGER  | 0             | 1 = a local notification is currently scheduled for this event                           |
|22 | reminder_minutes          | INTEGER  |               | Minutes before event to fire reminder. null = no reminder. Added in v2 migration.         |
|23 | location                  | TEXT     |               | Free-text location string (may be GPS-resolved via Nominatim). Added in v4 migration.     |
|24 | recurrence_calendar       | TEXT     |               | 'hebrew' or 'gregorian' — which calendar governs recurrence expansion. null for non-      |
|   |                           |          |               | recurring or weekly events. Added in v5 migration.                                        |
|25 | recurrence_id             | TEXT     |               | Links an exception or tombstone row to its master recurring event's id. null for normal   |
|   |                           |          |               | (non-exception) rows. Added in v5 migration.                                              |
|26 | is_exception              | INTEGER  | 0             | 1 = this row is an override or tombstone for a specific occurrence of a recurring series. |
|   |                           |          |               | Added in v5 migration.                                                                    |
|27 | exception_date            | TEXT     |               | ISO 8601 date YYYY-MM-DD of the occurrence this exception row overrides. null otherwise.  |
|   |                           |          |               | Added in v5 migration.                                                                    |
|28 | renewal_ask_suppressed    | INTEGER  | 0             | 1 = user has dismissed the yearly renewal prompt for this event; do not prompt again      |
|   |                           |          |               | until next renewal cycle. Added in v5 migration.                                          |
|29 | last_renewal_ask          | TEXT     |               | ISO 8601 date YYYY-MM-DD of the last time the renewal prompt was shown for this event.    |
|   |                           |          |               | Used to rate-limit prompts to at most once per year. Added in v5 migration.               |

### recurrence_type enum (post-v5)

| Value   | Meaning                                                         |
|---------|-----------------------------------------------------------------|
| none    | One-off, no recurrence                                          |
| weekly  | Repeats weekly (recurrence_calendar is always null)             |
| monthly | Repeats monthly; recurrence_calendar = 'hebrew' or 'gregorian' |
| yearly  | Repeats yearly;  recurrence_calendar = 'hebrew' or 'gregorian' |

Prior to v5, monthly and yearly recurrence were encoded as compound enum values
(monthly_hebrew, monthly_gregorian, yearly_hebrew, yearly_gregorian). The v5 migration
remaps all existing rows to the new orthogonal pair (recurrence_type + recurrence_calendar).
The compound values no longer appear in the database after v5 runs.

### Exception / tombstone pattern (v5+)

When a single occurrence of a recurring event is overridden or deleted:
- An exception row is inserted with `is_exception = 1`, `recurrence_id` pointing to the
  master event's `id`, and `exception_date` set to the YYYY-MM-DD of the occurrence.
- A tombstone (cancelled override) sets `status = 'cancelled'` on the exception row.
- The master row is never modified; expansion logic skips exception_date occurrences and
  substitutes the exception row (if not a tombstone).

### Renewal prompt fields (v5+)

`renewal_ask_suppressed` and `last_renewal_ask` together implement a once-per-year renewal
prompt rate-limit. Logic not yet built (schema-only as of v5); see DECISIONS.md
"NotificationRecord schema includes renewal and recurrence fields".

---

## Indexes

| Index name              | Columns                   | Added | Purpose                                                                 |
|-------------------------|---------------------------|-------|-------------------------------------------------------------------------|
| (PRIMARY KEY)           | id                        | v1    | Row lookup by UUID                                                      |
| idx_events_daterange    | start_date, end_date      | v6    | Range-overlap scan: `WHERE start_date <= ? AND end_date >= ?` used by   |
|                         |                           |       | getNotesInRange and getEventsForGregorianDate (converting to overlap    |
|                         |                           |       | semantics in the next agent slice). start_date leads so SQLite can      |
|                         |                           |       | bound the scan on the upper side of the range (events that start on or  |
|                         |                           |       | before the query end date); end_date in the same index lets it then     |
|                         |                           |       | filter events that haven't ended yet.                                   |

Query patterns that may benefit from additional indexes in a future migration:

- `(start_date, status)` — getEventsForGregorianDate (point-day query, pre-overlap)
- `(hebrew_day, hebrew_month, calendar_type, status)` — getEventsForHebrewDate
- `(recurrence_type, status)` — getAllRecurringNotes

---

## Access pattern

All reads and writes go through `StorageService` (src/services/StorageService.ts). Every
transactionAsync call is serialized through the `runExclusive` single-flight gate — callers
must not bypass it. See DECISIONS.md "All SQLite access serialized through a single-flight
queue in StorageService" for full rationale.
