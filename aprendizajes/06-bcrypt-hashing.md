# Hashing de Contraseñas con bcrypt

## ¿Qué es hashing?

Transformación **irreversible** (unidireccional). No se puede reconstruir la contraseña original a partir del hash. Solo se puede verificar si un texto dado produce el mismo resultado.

## Anatomía de un hash bcrypt

```
$2a$10$UbywX67eT3b6zK.Mte8jqe164uL0mI2bH8F6O9M2mN6P/7A2n2S.m
 │   │  │                       │
 │   │  └─ Salt (22 chars)      └─ Hash resultante (31 chars)
 │   └─ Cost factor (10 rounds = 2^10 iteraciones)
 └─ Versión del algoritmo
```

La **salt** es un valor aleatorio embebido en el propio hash. Evita que dos contraseñas iguales produzcan el mismo hash.

## Cómo funciona la verificación

1. `bcrypt.compare(password, hashAlmacenado)` extrae la salt de los primeros 29 caracteres
2. Hashea el `password` ingresado usando esa salt
3. Compara el resultado con el hash almacenado
4. Si coinciden → contraseña correcta

## Implementación en la plataforma

**Crear/cambiar contraseña:**
```javascript
const newHash = await bcrypt.hash(newPassword, 10); // 10 rounds
```

**Verificar en login:**
```javascript
const ok = await bcrypt.compare(password, user.password_hash);
```

## Generar hash para seeds

```bash
node -e "const bcrypt = require('bcryptjs'); bcrypt.hash('TU_CONTRASEÑA', 10).then(h => console.log(h));"
```

## Seguridad adicional implementada

- **Timing attack prevention**: bcrypt.compare contra hash dummy si usuario no existe
- **Rate limiting**: 5 intentos / 15 minutos para cambio de contraseña inicial
- **Cost factor 10**: ~100ms por verificación, dificulta fuerza bruta
