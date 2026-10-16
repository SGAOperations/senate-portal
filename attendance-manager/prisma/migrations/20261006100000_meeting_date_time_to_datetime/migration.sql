CREATE FUNCTION pg_temp.parse_meeting_date(value text)
RETURNS date
LANGUAGE plpgsql
IMMUTABLE
AS $$
DECLARE
  parts text[];
BEGIN
  value := btrim(value);

  IF value ~ '^\d{4}-\d{1,2}-\d{1,2}$' THEN
    parts := regexp_match(value, '^(\d{4})-(\d{1,2})-(\d{1,2})$');
    RETURN make_date(parts[1]::integer, parts[2]::integer, parts[3]::integer);
  END IF;

  IF value ~ '^\d{1,2}/\d{1,2}/\d{4}$' THEN
    parts := regexp_match(value, '^(\d{1,2})/(\d{1,2})/(\d{4})$');
    RETURN make_date(parts[3]::integer, parts[1]::integer, parts[2]::integer);
  END IF;

  RETURN NULL;
EXCEPTION WHEN OTHERS THEN
  RETURN NULL;
END;
$$;

CREATE FUNCTION pg_temp.parse_meeting_time(value text)
RETURNS time
LANGUAGE plpgsql
IMMUTABLE
AS $$
DECLARE
  parts text[];
  hours integer;
  minutes integer;
  seconds integer;
  period text;
BEGIN
  parts := regexp_match(
    btrim(value),
    '^(\d{1,2}):(\d{2})(?::(\d{2}))?\s*(AM|PM)?$',
    'i'
  );
  IF parts IS NULL THEN
    RETURN NULL;
  END IF;

  hours := parts[1]::integer;
  minutes := parts[2]::integer;
  seconds := coalesce(parts[3], '0')::integer;
  period := upper(parts[4]);

  IF minutes > 59 OR seconds > 59 THEN
    RETURN NULL;
  END IF;

  IF period IS NOT NULL THEN
    IF hours < 1 OR hours > 12 THEN
      RETURN NULL;
    END IF;
    IF period = 'AM' AND hours = 12 THEN
      hours := 0;
    ELSIF period = 'PM' AND hours <> 12 THEN
      hours := hours + 12;
    END IF;
  ELSIF hours > 23 THEN
    RETURN NULL;
  END IF;

  RETURN make_time(hours, minutes, seconds)::time;
EXCEPTION WHEN OTHERS THEN
  RETURN NULL;
END;
$$;

DO $$
DECLARE
  invalid_count bigint;
  invalid_rows text;
BEGIN
  SELECT count(*)
  INTO invalid_count
  FROM "Meeting"
  WHERE pg_temp.parse_meeting_date("date") IS NULL
    OR pg_temp.parse_meeting_time("startTime") IS NULL
    OR pg_temp.parse_meeting_time("endTime") IS NULL
    OR (
      pg_temp.parse_meeting_date("date") IS NOT NULL
      AND pg_temp.parse_meeting_time("startTime") IS NOT NULL
      AND ((pg_temp.parse_meeting_date("date") + pg_temp.parse_meeting_time("startTime"))
        AT TIME ZONE 'America/New_York') AT TIME ZONE 'America/New_York'
        <> pg_temp.parse_meeting_date("date") + pg_temp.parse_meeting_time("startTime")
    )
    OR (
      pg_temp.parse_meeting_date("date") IS NOT NULL
      AND pg_temp.parse_meeting_time("endTime") IS NOT NULL
      AND ((pg_temp.parse_meeting_date("date") + pg_temp.parse_meeting_time("endTime"))
        AT TIME ZONE 'America/New_York') AT TIME ZONE 'America/New_York'
        <> pg_temp.parse_meeting_date("date") + pg_temp.parse_meeting_time("endTime")
    );

  IF invalid_count > 0 THEN
    SELECT string_agg(
      format(
        'meetingId=%s date=%L startTime=%L endTime=%L',
        "meetingId", "date", "startTime", "endTime"
      ),
      E'\n'
    )
    INTO invalid_rows
    FROM (
      SELECT "meetingId", "date", "startTime", "endTime"
      FROM "Meeting"
      WHERE pg_temp.parse_meeting_date("date") IS NULL
        OR pg_temp.parse_meeting_time("startTime") IS NULL
        OR pg_temp.parse_meeting_time("endTime") IS NULL
        OR (
          pg_temp.parse_meeting_date("date") IS NOT NULL
          AND pg_temp.parse_meeting_time("startTime") IS NOT NULL
          AND ((pg_temp.parse_meeting_date("date") + pg_temp.parse_meeting_time("startTime"))
            AT TIME ZONE 'America/New_York') AT TIME ZONE 'America/New_York'
            <> pg_temp.parse_meeting_date("date") + pg_temp.parse_meeting_time("startTime")
        )
        OR (
          pg_temp.parse_meeting_date("date") IS NOT NULL
          AND pg_temp.parse_meeting_time("endTime") IS NOT NULL
          AND ((pg_temp.parse_meeting_date("date") + pg_temp.parse_meeting_time("endTime"))
            AT TIME ZONE 'America/New_York') AT TIME ZONE 'America/New_York'
            <> pg_temp.parse_meeting_date("date") + pg_temp.parse_meeting_time("endTime")
        )
      ORDER BY "meetingId"
      LIMIT 20
    ) AS invalid_meetings;

    RAISE EXCEPTION
      'Cannot convert Meeting date/time columns: % row(s) are unparseable. First invalid rows:%',
      invalid_count,
      E'\n' || invalid_rows;
  END IF;
END;
$$;

ALTER TABLE "Meeting"
  ADD COLUMN "date_datetime" TIMESTAMPTZ(3),
  ADD COLUMN "startTime_datetime" TIMESTAMPTZ(3),
  ADD COLUMN "endTime_datetime" TIMESTAMPTZ(3);

UPDATE "Meeting"
SET
  "date_datetime" = pg_temp.parse_meeting_date("date")::timestamp
    AT TIME ZONE 'America/New_York',
  "startTime_datetime" = (
    pg_temp.parse_meeting_date("date") + pg_temp.parse_meeting_time("startTime")
  ) AT TIME ZONE 'America/New_York',
  "endTime_datetime" = (
    pg_temp.parse_meeting_date("date") + pg_temp.parse_meeting_time("endTime")
  ) AT TIME ZONE 'America/New_York';

ALTER TABLE "Meeting"
  DROP COLUMN "date",
  DROP COLUMN "startTime",
  DROP COLUMN "endTime";

ALTER TABLE "Meeting"
  RENAME COLUMN "date_datetime" TO "date";

ALTER TABLE "Meeting"
  RENAME COLUMN "startTime_datetime" TO "startTime";

ALTER TABLE "Meeting"
  RENAME COLUMN "endTime_datetime" TO "endTime";

ALTER TABLE "Meeting"
  ALTER COLUMN "date" SET NOT NULL,
  ALTER COLUMN "startTime" SET NOT NULL,
  ALTER COLUMN "endTime" SET NOT NULL;