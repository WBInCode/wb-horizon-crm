-- Usuwa komplet danych demonstracyjnych.
-- CRM: wszystko ma identyfikatory z przedrostkiem demo-.
-- Uruchom na bazie crm:
--   docker exec -i wb-postgres psql -U wbadmin -d crm < usun-demo.sql
begin;

delete from "Case" where id like 'demo-%';
delete from "ContactPerson" where id like 'demo-%';
delete from "StructureClient" where "structureId" like 'demo-%';
delete from "StructureMember" where id like 'demo-%';
delete from "Structure" where id like 'demo-%';
delete from "Client" where id like 'demo-%';
delete from "UserSession" where "userId" like 'demo-%';
delete from "LoginAttempt" where "userId" like 'demo-%';
delete from "User" where id like 'demo-%';

commit;

-- Na bazie hub (osobno):
--   delete from instance_access where "userId" = '9d3f7a10-5c2b-4e8a-9f61-0a7b3c5d8e01';
--   delete from memberships     where "userId" = '9d3f7a10-5c2b-4e8a-9f61-0a7b3c5d8e01';
--   delete from handoff_tickets where "userId" = '9d3f7a10-5c2b-4e8a-9f61-0a7b3c5d8e01';
--   delete from users           where id       = '9d3f7a10-5c2b-4e8a-9f61-0a7b3c5d8e01';
