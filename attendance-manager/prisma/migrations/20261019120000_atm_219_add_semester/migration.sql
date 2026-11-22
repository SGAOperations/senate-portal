CREATE TYPE "Term" AS ENUM ('FALL', 'SPRING');

CREATE TABLE "Semester" (
    "semesterId" TEXT NOT NULL,
    "term" "Term" NOT NULL,
    "year" INTEGER NOT NULL,
    "startsOn" DATE NOT NULL,
    "endsOn" DATE NOT NULL,

    CONSTRAINT "Semester_pkey" PRIMARY KEY ("semesterId")
);

CREATE UNIQUE INDEX "Semester_term_year_key" ON "Semester"("term", "year");

ALTER TABLE "Semester"
  ADD CONSTRAINT "Semester_startsOn_lte_endsOn" CHECK ("startsOn" <= "endsOn"),
  ADD CONSTRAINT "Semester_no_overlap"
    EXCLUDE USING gist (daterange("startsOn", "endsOn", '[]') WITH &&);

INSERT INTO "Semester" ("semesterId", "term", "year", "startsOn", "endsOn")
SELECT
  gen_random_uuid()::text,
  CASE WHEN half.is_spring THEN 'SPRING' ELSE 'FALL' END::"Term",
  half.year,
  CASE WHEN half.is_spring THEN make_date(half.year, 1, 1)
    ELSE make_date(half.year, 7, 1) END,
  CASE WHEN half.is_spring THEN make_date(half.year, 6, 30)
    ELSE make_date(half.year, 12, 31) END
FROM (
  SELECT DISTINCT
    extract(year FROM day)::integer AS year,
    extract(month FROM day) <= 6 AS is_spring
  FROM (
    SELECT ("date" AT TIME ZONE 'America/New_York')::date AS day FROM "Meeting"
    UNION
    SELECT (now() AT TIME ZONE 'America/New_York')::date
  ) AS days
) AS half;

ALTER TABLE "Meeting" ADD COLUMN "semesterId" TEXT;

UPDATE "Meeting" AS m
SET "semesterId" = s."semesterId"
FROM "Semester" AS s
WHERE (m."date" AT TIME ZONE 'America/New_York')::date
  BETWEEN s."startsOn" AND s."endsOn";

ALTER TABLE "Meeting" ALTER COLUMN "semesterId" SET NOT NULL;

CREATE INDEX "Meeting_semesterId_idx" ON "Meeting"("semesterId");

ALTER TABLE "Meeting" ADD CONSTRAINT "Meeting_semesterId_fkey" FOREIGN KEY ("semesterId") REFERENCES "Semester"("semesterId") ON DELETE RESTRICT ON UPDATE CASCADE;