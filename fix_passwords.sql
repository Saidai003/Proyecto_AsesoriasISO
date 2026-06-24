UPDATE USUARIOS SET password_hash='\$2a\$10\$0fCyG0RW44LBr89cL9sVvOFghxcGVoUKu6PvAVpoSqaefr44M87m.' WHERE email IN ('admin@demo.local', 'evaluador@demo.local', 'responsable@demo.local');
SELECT id, email, password_hash FROM USUARIOS WHERE id IN (1,2,3);
