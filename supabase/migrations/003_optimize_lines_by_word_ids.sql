-- Fix: Letter Set "Lines" search timed out (anon statement_timeout = 3s).
-- The old search_lines_by_word_ids used count(*) over() which forced counting
-- every matching line by scanning all ~400k word_occurrences (~2.2s) on top of
-- the DISTINCT join (~4.6s total for a broad letter set). PostgREST cancelled it.
--
-- This version drops the exact total and uses an EXISTS semi-join, which lets the
-- planner walk lines in (ang, line_no) order via the lines_ang index and stop as
-- soon as it has a page. Measured: ~5ms for a broad set, ~480ms worst case
-- (rare letter, deep offset). The caller fetches p_limit+1 rows to learn whether
-- another page exists, instead of computing a total.

drop function if exists search_lines_by_word_ids(bigint[], text, text, int, int, int, int);

create or replace function search_lines_by_word_ids(
  p_word_ids bigint[],
  p_raag     text default null,
  p_writer   text default null,
  p_ang_min  int  default null,
  p_ang_max  int  default null,
  p_limit    int  default 20,
  p_offset   int  default 0
)
returns table(
  id               bigint,
  verse_id         int,
  shabad_id        int,
  ang              int,
  line_no          int,
  gurmukhi         text,
  translation_en   text,
  transliteration_en text,
  raag_english     text,
  raag_gurmukhi    text,
  writer_english   text,
  writer_id        int,
  ang_start        int
)
language sql stable
as $$
  select
    l.id, l.verse_id, l.shabad_id, l.ang, l.line_no,
    l.gurmukhi, l.translation_en, l.transliteration_en,
    s.raag_english, s.raag_gurmukhi, s.writer_english, s.writer_id, s.ang_start
  from lines l
  left join shabads s on s.id = l.shabad_id
  where exists (
    select 1 from word_occurrences wo
    where wo.line_id = l.id and wo.word_id = any(p_word_ids)
  )
    and (p_raag    is null or s.raag_english    = p_raag)
    and (p_writer  is null or s.writer_english  = p_writer)
    and (p_ang_min is null or l.ang >= p_ang_min)
    and (p_ang_max is null or l.ang <= p_ang_max)
  order by l.ang, l.line_no
  limit p_limit
  offset p_offset;
$$;

grant execute on function search_lines_by_word_ids to anon;
