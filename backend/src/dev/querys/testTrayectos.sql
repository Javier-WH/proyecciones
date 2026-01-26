SELECT 
    ucs.id as "ucId",
    ucs.descripcion as "subjectName",
    programas.programa as "PNF",
    CASE 
        WHEN pensum_ucs.ptrimestre_1 = 100 THEN true
        WHEN pensum_ucs.ptrimestre_1 = 0 THEN false
        ELSE true
    END as "q1",
    CASE 
        WHEN pensum_ucs.ptrimestre_1 = 100 THEN true
        WHEN pensum_ucs.ptrimestre_2 = 0 THEN false
        ELSE true
    END as "q2",
    CASE 
        WHEN pensum_ucs.ptrimestre_1 = 100 THEN true
        WHEN pensum_ucs.ptrimestre_3 = 0 THEN false
        ELSE true
    END as "q3"
FROM pensum_ucs
LEFT JOIN ucs ON pensum_ucs.uc_id = ucs.id 
LEFT JOIN programas ON programas.id = pensum_ucs.pensum_id
WHERE pensum_ucs.pensum_id = 13 AND ucs.trayecto_id = 2;