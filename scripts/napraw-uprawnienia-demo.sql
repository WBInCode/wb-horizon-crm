-- Uzupelnia szablon uprawnien kontom demonstracyjnym.
-- Przy zakladaniu kont bezposrednio w SQL pominieta zostala sciezka JIT z /sso/callback,
-- ktora normalnie podpina RoleTemplate. Bez niego uzytkownik nie ma zadnych uprawnien
-- i nawigacja renderuje sie pusta.
begin;

update "User" u
set "roleTemplateId" = rt.id
from "RoleTemplate" rt
where rt.name = u.role::text
  and u.id like 'demo-%'
  and u."roleTemplateId" is null;

commit;

select u.email, u.role, rt.name as szablon,
       (select count(*) from "RolePermission" rp where rp."roleTemplateId" = rt.id) as uprawnien
from "User" u
left join "RoleTemplate" rt on rt.id = u."roleTemplateId"
where u.id like 'demo-%'
order by u.role::text, u.email;
