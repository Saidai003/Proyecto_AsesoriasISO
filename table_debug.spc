* table_debug.spc
* Debug and safe TABLE variants for CPV2024
* Usage: run this script inside Redatam (execute commands one-by-one if needed).

* ----- OPEN dataset -----
* Edit the filename below if your RBF has a different name.
OPEN cpv202401.rbf

* ----- Minimal test: numeric region code (recommended) -----
* Counts total by numeric region code `REDCODEN` (should always exist).
TABLE
ROWS REDCODEN
COLUMNS NONE
VALUES COUNT(*) AS total_REDCODEN

* ----- Minimal test: string region code (may fail on some servers) -----
TABLE
ROWS COD_REGION
COLUMNS NONE
VALUES COUNT(*) AS total_COD_REGION

* ----- Stepwise WHERE additions (use these in sequence to identify which clause breaks) -----
* Step 1: only 'ocupado'
TABLE
ROWS REDCODEN
COLUMNS NONE
VALUES COUNT(*) AS step1_ocupado
WHERE (SIT_FUERZA_TRABAJO = 1)

* Step 2: add sector (minería o manufactura)
TABLE
ROWS REDCODEN
COLUMNS NONE
VALUES COUNT(*) AS step2_ocupado_sector
WHERE (SIT_FUERZA_TRABAJO = 1) AND (COD_CAENES IN (2,3))

* Step 3: add high education
TABLE
ROWS REDCODEN
COLUMNS NONE
VALUES COUNT(*) AS step3_ocupado_sector_edu
WHERE (SIT_FUERZA_TRABAJO = 1) AND (COD_CAENES IN (2,3)) AND (CINE11 IN (10,11))

* Step 4: add managerial occupation
TABLE
ROWS REDCODEN
COLUMNS NONE
VALUES COUNT(*) AS step4_ocupado_sector_edu_jefe
WHERE (SIT_FUERZA_TRABAJO = 1) AND (COD_CAENES IN (2,3)) AND (CINE11 IN (10,11)) AND (COD_CIUO = 2)

* Step 5: add age filter (full numerator)
TABLE
ROWS REDCODEN
COLUMNS NONE
VALUES COUNT(*) AS Numerador_Pregunta
WHERE (SIT_FUERZA_TRABAJO = 1) AND (COD_CAENES IN (2,3)) AND (CINE11 IN (10,11)) AND (COD_CIUO = 2) AND (EDAD >= 15 AND EDAD <= 64)

* ----- Alternative: full TABLE using COD_REGION (string) if your server accepts it -----
TABLE
ROWS COD_REGION
COLUMNS NONE
VALUES COUNT(*) AS Numerador_Pregunta_COD_REGION
WHERE (SIT_FUERZA_TRABAJO = 1) AND (COD_CAENES IN (2,3)) AND (CINE11 IN (10,11)) AND (COD_CIUO = 2) AND (EDAD >= 15 AND EDAD <= 64)

* ----- Notes -----
* - Run blocks one at a time. If a block errors, the last added WHERE clause is likely the cause.
* - If `REDCODEN` works but `COD_REGION` errors, use `REDCODEN` in ROWS (numeric identifiers are safer).
* - If both minimal tests fail, verify the dataset is actually open and the filename in the OPEN command matches your RBF.
* - If you get syntax errors on IN(...) try replacing with explicit OR clauses: (COD_CAENES = 2 OR COD_CAENES = 3)
