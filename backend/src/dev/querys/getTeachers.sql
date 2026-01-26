#node .\src\backEnd\dataBase\querys\teachers\getTeacherList.js

SELECT 
teachers.id,
teachers.name,
teachers.last_name,
teachers.ci,
teachers.title,
genders.name AS "gender",
contract_types.contractType AS "type",
contract_types.hours AS "partTime",
teachers.perfil_name_id AS "perfil_id"
FROM teachers 
JOIN genders ON genders.id = teachers.gender_id
JOIN contract_types ON contract_types.id = teachers.contractTypes_id


SELECT 
perfil_names.name AS "perfil",
subjects.name AS "subject",
perfiles.id AS "perfil_id",
perfil_names.id AS 'perfil_name_id',
subjects.id AS 'subject_id'
FROM perfiles 
JOIN perfil_names ON perfil_names.id = perfiles.perfil_name_id
JOIN subjects ON subjects.id = perfiles.subject_id
WHERE perfil_names.id = 'aa80d025-ab66-40aa-b99e-6bdeba1379b1'

SELECT 
pensums.subject_id AS 'id',
subjects.name AS 'subject',
pensums.hours AS 'hours',
pnfs.name AS 'pnf',
pensums.quarter AS 'quarter'
FROM pensums
JOIN pnfs ON pnfs.id = pensums.pnf_id
JOIN subjects ON subjects.id = pensums.subject_id


SELECT * from perfil_names 
JOIN perfiles ON perfiles.perfil_name_id = perfil_names.id
WHERE perfil_names.id = '36ec9b6d-2602-4a45-ac84-bcf097cc12a6'

