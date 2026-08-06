-- Konto demonstracyjne w WB Platform (hub).
-- Nalezy do istniejacej organizacji WB Partners, bo wdrozenie CRM przyjmuje
-- bilety SSO wylacznie z instancji 95a92694-... (isAllowedTenant w src/lib/hub.ts).
begin;

insert into users (id, email, "passwordHash", "displayName", "isPlatformAdmin", "createdAt", "updatedAt")
values (
  '9d3f7a10-5c2b-4e8a-9f61-0a7b3c5d8e01',
  'dyrektor.demo@wb-partners.pl',
  '$argon2id$v=19$m=65536,t=3,p=4$qSy1peEcEuZZ6b8e0sjpyw$dj6yfHnPxzbVDMjQRov/C6HJXTI42Fqtv5kOK7f32DY',
  'Dyrektor Demo (konto testowe)',
  false, now(), now()
)
on conflict (email) do nothing;

insert into memberships (id, "userId", "orgId", role, "createdAt")
values (
  '9d3f7a10-5c2b-4e8a-9f61-0a7b3c5d8e02',
  '9d3f7a10-5c2b-4e8a-9f61-0a7b3c5d8e01',
  '72a0f63f-d785-43a0-a9a0-d2c8a3b6ed14',
  'MEMBER', now()
)
on conflict ("userId", "orgId") do nothing;

insert into instance_access (id, "userId", "instanceId", role, "createdAt")
values (
  '9d3f7a10-5c2b-4e8a-9f61-0a7b3c5d8e03',
  '9d3f7a10-5c2b-4e8a-9f61-0a7b3c5d8e01',
  '95a92694-94c7-4a74-a302-56dc18ddc6af',
  'member', now()
)
on conflict ("userId", "instanceId") do nothing;

commit;

select u.email, u."displayName", m.role as w_organizacji, ia.role as w_instancji
from users u
left join memberships m on m."userId" = u.id
left join instance_access ia on ia."userId" = u.id
where u.email = 'dyrektor.demo@wb-partners.pl';
