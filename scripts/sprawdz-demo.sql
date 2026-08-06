\pset border 2
select s.name as firma, u.name as dyrektor, count(distinct sc."clientId") as kontrahentow, count(distinct sm."userId") as czlonkow
from "Structure" s
join "User" u on u.id = s."directorId"
left join "StructureClient" sc on sc."structureId" = s.id
left join "StructureMember" sm on sm."structureId" = s.id
where s.id = 'demo-str-001'
group by s.name, u.name;

select c."companyName" as kontrahent, c.stage as etap, wl.email as konto_klienta,
       (select count(*) from "ContactPerson" cp where cp."clientId" = c.id) as osob_kontaktowych,
       (select count(*) from "Case" k where k."clientId" = c.id) as sprzedazy
from "Client" c
left join "User" wl on wl.id = c."ownerId" and wl.role = 'CLIENT'
where c.id like 'demo-kon-%'
order by c."companyName";
