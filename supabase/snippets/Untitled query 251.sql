select
    policyname,
    cmd,
    roles,
    qual,
    with_check
from pg_policies
where schemaname = 'storage'
  and tablename = 'objects'
  and (
    policyname like 'avatars_%'
    or policyname like 'covers_%'
  )
order by policyname;